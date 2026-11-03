import { deflateSync, inflateSync } from 'node:zlib';

export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

interface PngHeader {
  readonly width: number;
  readonly height: number;
  readonly bitDepth: number;
  readonly colorType: number;
  readonly compression: number;
  readonly filter: number;
  readonly interlace: number;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WRITE_BLOCK = 0xffffffff;

function chunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBytes, data]);
  const result = Buffer.alloc(12 + data.byteLength);
  result.writeUInt32BE(data.byteLength, 0);
  body.copy(result, 4);
  result.writeUInt32BE(crc32(body), 8 + data.byteLength);
  return result;
}

function crc32(data: Uint8Array): number {
  let value = WRITE_BLOCK;
  for (const byte of data) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
    }
  }
  return (value ^ WRITE_BLOCK) >>> 0;
}

function paeth(left: number, up: number, upperLeft: number): number {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);

  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  if (upDistance <= upperLeftDistance) return up;
  return upperLeft;
}

function parseHeader(data: Uint8Array): PngHeader {
  if (data.byteLength !== 13) throw new Error('invalid PNG IHDR length');

  return {
    width: Buffer.from(data.buffer, data.byteOffset, data.byteLength).readUInt32BE(0),
    height: Buffer.from(data.buffer, data.byteOffset, data.byteLength).readUInt32BE(4),
    bitDepth: data[8] ?? 0,
    colorType: data[9] ?? 0,
    compression: data[10] ?? 0,
    filter: data[11] ?? 0,
    interlace: data[12] ?? 0,
  };
}

function bytesPerPixel(colorType: number): number {
  switch (colorType) {
    case 0:
      return 1;
    case 2:
      return 3;
    case 4:
      return 2;
    case 6:
      return 4;
    default:
      throw new Error(`unsupported PNG colour type ${colorType}`);
  }
}

function unfilter(
  compressed: Uint8Array,
  width: number,
  height: number,
  pixelBytes: number,
): Uint8Array {
  const rowBytes = width * pixelBytes;
  const stride = rowBytes + 1;
  const expected = stride * height;
  if (compressed.byteLength !== expected) {
    throw new Error(
      `invalid PNG scanline size: expected ${expected}, got ${compressed.byteLength}`,
    );
  }

  const output = new Uint8Array(rowBytes * height);
  for (let y = 0; y < height; y += 1) {
    const inputOffset = y * stride;
    const filter = compressed[inputOffset];
    const outputOffset = y * rowBytes;

    for (let x = 0; x < rowBytes; x += 1) {
      const value = compressed[inputOffset + 1 + x] ?? 0;
      const left = x >= pixelBytes ? (output[outputOffset + x - pixelBytes] ?? 0) : 0;
      const up = y > 0 ? (output[outputOffset + x - rowBytes] ?? 0) : 0;
      const upperLeft =
        y > 0 && x >= pixelBytes ? (output[outputOffset + x - rowBytes - pixelBytes] ?? 0) : 0;

      let decoded: number;
      switch (filter) {
        case 0:
          decoded = value;
          break;
        case 1:
          decoded = value + left;
          break;
        case 2:
          decoded = value + up;
          break;
        case 3:
          decoded = value + Math.floor((left + up) / 2);
          break;
        case 4:
          decoded = value + paeth(left, up, upperLeft);
          break;
        default:
          throw new Error(`unsupported PNG filter ${String(filter)} on row ${y}`);
      }

      output[outputOffset + x] = decoded & 0xff;
    }
  }

  return output;
}

export function decodePng(input: Uint8Array): RgbaImage {
  const png = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  if (png.byteLength < PNG_SIGNATURE.byteLength) throw new Error('invalid PNG: too short');
  if (!png.subarray(0, PNG_SIGNATURE.byteLength).equals(PNG_SIGNATURE)) {
    throw new Error('invalid PNG signature');
  }

  let header: PngHeader | undefined;
  const idat: Buffer[] = [];
  let offset = PNG_SIGNATURE.byteLength;
  let ended = false;

  while (offset + 12 <= png.byteLength) {
    const length = png.readUInt32BE(offset);
    const typeOffset = offset + 4;
    const dataOffset = typeOffset + 4;
    const crcOffset = dataOffset + length;
    if (crcOffset + 4 > png.byteLength) throw new Error('invalid PNG chunk length');

    const type = png.toString('ascii', typeOffset, dataOffset);
    const data = png.subarray(dataOffset, crcOffset);
    const expectedCrc = png.readUInt32BE(crcOffset);
    const actualCrc = crc32(png.subarray(typeOffset, crcOffset));
    if (actualCrc !== expectedCrc) throw new Error(`invalid PNG chunk CRC (${type})`);

    if (type === 'IHDR') {
      if (header !== undefined) throw new Error('duplicate PNG IHDR');
      if (offset !== PNG_SIGNATURE.byteLength) throw new Error('PNG IHDR must be first');
      header = parseHeader(data);
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      ended = true;
      break;
    }

    offset = crcOffset + 4;
  }

  if (header === undefined) throw new Error('PNG has no IHDR');
  if (!ended) throw new Error('PNG has no IEND');
  if (idat.length === 0) throw new Error('PNG has no IDAT');
  if (header.width === 0 || header.height === 0) throw new Error('PNG dimensions must be positive');
  if (header.bitDepth !== 8) throw new Error(`unsupported PNG bit depth ${header.bitDepth}`);
  if (header.compression !== 0) throw new Error('unsupported PNG compression method');
  if (header.filter !== 0) throw new Error('unsupported PNG filter method');
  if (header.interlace !== 0) throw new Error('interlaced PNG is not supported');

  const pixelBytes = bytesPerPixel(header.colorType);
  const inflated = inflateSync(Buffer.concat(idat));
  const pixels = unfilter(inflated, header.width, header.height, pixelBytes);
  const rgba = new Uint8Array(header.width * header.height * 4);

  for (let index = 0; index < header.width * header.height; index += 1) {
    const source = index * pixelBytes;
    const target = index * 4;

    if (header.colorType === 0 || header.colorType === 4) {
      const grey = pixels[source] ?? 0;
      rgba[target] = grey;
      rgba[target + 1] = grey;
      rgba[target + 2] = grey;
      rgba[target + 3] = header.colorType === 4 ? (pixels[source + 1] ?? 0) : 0xff;
    } else {
      rgba[target] = pixels[source] ?? 0;
      rgba[target + 1] = pixels[source + 1] ?? 0;
      rgba[target + 2] = pixels[source + 2] ?? 0;
      rgba[target + 3] = header.colorType === 6 ? (pixels[source + 3] ?? 0) : 0xff;
    }
  }

  return { width: header.width, height: header.height, data: rgba };
}

function encode(width: number, height: number, colorType: 0 | 6, data: Uint8Array): Buffer {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('PNG dimensions must be positive integers');
  }

  const pixelBytes = colorType === 6 ? 4 : 1;
  const expected = width * height * pixelBytes;
  if (data.byteLength !== expected) {
    throw new Error(`invalid image data: expected ${expected}, got ${data.byteLength}`);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;

  const raw = Buffer.alloc(height * (width * pixelBytes + 1));
  for (let y = 0; y < height; y += 1) {
    const targetOffset = y * (width * pixelBytes + 1);
    raw[targetOffset] = 0;
    Buffer.from(data.buffer, data.byteOffset + y * width * pixelBytes, width * pixelBytes).copy(
      raw,
      targetOffset + 1,
    );
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function encodeRgbaPng(image: RgbaImage): Buffer {
  return encode(image.width, image.height, 6, image.data);
}

export function encodeGrayscalePng(width: number, height: number, data: Uint8Array): Buffer {
  return encode(width, height, 0, data);
}

function assertSameSize(left: RgbaImage, right: RgbaImage): void {
  const leftLength = left.width * left.height * 4;
  const rightLength = right.width * right.height * 4;
  if (left.data.byteLength !== leftLength || right.data.byteLength !== rightLength) {
    throw new Error('invalid RGBA buffer length');
  }
  if (left.width !== right.width || left.height !== right.height) {
    throw new Error(
      `RGBA size mismatch: ${left.width}x${left.height} vs ${right.width}x${right.height}`,
    );
  }
}

export function compareRgba(left: RgbaImage, right: RgbaImage): number {
  assertSameSize(left, right);

  let differingPixels = 0;
  for (let offset = 0; offset < left.data.byteLength; offset += 4) {
    if (
      left.data[offset] !== right.data[offset] ||
      left.data[offset + 1] !== right.data[offset + 1] ||
      left.data[offset + 2] !== right.data[offset + 2] ||
      left.data[offset + 3] !== right.data[offset + 3]
    ) {
      differingPixels += 1;
    }
  }

  return differingPixels;
}

export function diffRgbaMask(left: RgbaImage, right: RgbaImage): Uint8Array {
  assertSameSize(left, right);

  const mask = new Uint8Array(left.width * left.height);
  for (let pixel = 0; pixel < mask.byteLength; pixel += 1) {
    const offset = pixel * 4;
    if (
      left.data[offset] !== right.data[offset] ||
      left.data[offset + 1] !== right.data[offset + 1] ||
      left.data[offset + 2] !== right.data[offset + 2] ||
      left.data[offset + 3] !== right.data[offset + 3]
    ) {
      mask[pixel] = 0xff;
    }
  }

  return mask;
}
