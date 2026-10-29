'use client';

import { useEffect, useRef } from 'react';

import styles from './fixture.module.css';

const BOX_COUNT = 12;
const BOXES = Array.from({ length: BOX_COUNT }, (_, index) => index);
const SOURCE_LANE_ID = 'fps-calibration-compositor';
const MAIN_LANE_ID = 'fps-calibration-main-thread';

export function MainThreadLane() {
  const laneRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const sourceLane = document.getElementById(SOURCE_LANE_ID);
    const mainLane = laneRef.current;
    const sourceBox = sourceLane?.querySelector<HTMLElement>('[data-lane-box]');
    const animation = sourceBox?.getAnimations()[0];

    if (!mainLane || !animation?.effect) {
      return;
    }

    const mainBoxes = Array.from(mainLane.querySelectorAll<HTMLElement>('[data-lane-box]'));
    const track = mainLane.querySelector<HTMLElement>('[data-lane-track]');

    if (!track) {
      return;
    }

    // Same distance as the compositor lane: the box slides across the full track width.
    const travel = Math.max(0, track.clientWidth - (mainBoxes[0]?.offsetWidth ?? 0));
    let frame = requestAnimationFrame(function render() {
      const progress = animation.effect?.getComputedTiming().progress;

      if (typeof progress === 'number') {
        for (const box of mainBoxes) {
          box.style.transform = `translateX(${progress * travel}px)`;
        }
      }

      frame = requestAnimationFrame(render);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section
      id={MAIN_LANE_ID}
      ref={laneRef}
      className={styles.lane}
      aria-labelledby="main-lane-heading"
    >
      <h2 id="main-lane-heading" className={styles.laneHeading}>
        Main-thread lane
      </h2>
      <div data-lane-track className={styles.track} aria-hidden="true">
        {BOXES.map((box) => (
          <div key={box} data-lane-box className={`${styles.box} ${styles.mainThreadBox}`} />
        ))}
      </div>
    </section>
  );
}
