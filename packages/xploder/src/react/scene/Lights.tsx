export function Lights() {
  return (
    <>
      <ambientLight intensity={1.6} />
      <directionalLight position={[6, 10, 8]} intensity={2.4} />
    </>
  );
}
