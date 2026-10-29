import { MainThreadLane } from './main-lane';
import styles from './fixture.module.css';

const BOX_COUNT = 12;
const BOXES = Array.from({ length: BOX_COUNT }, (_, index) => index);

export default function FpsCalibrationPage() {
  return (
    <main data-perf-fixture="fps-calibration" className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Development fixture</p>
        <h1 className={styles.title}>FPS calibration</h1>
        <p className={styles.description}>
          Two synchronized lanes exercise compositor and main-thread frame production.
        </p>
      </header>

      <section className={styles.lane} aria-labelledby="compositor-lane-heading">
        <h2 id="compositor-lane-heading" className={styles.laneHeading}>
          Compositor lane
        </h2>
        <div id="fps-calibration-compositor" className={styles.track} aria-hidden="true">
          {BOXES.map((box) => (
            <div key={box} data-lane-box className={`${styles.box} ${styles.compositorBox}`} />
          ))}
        </div>
      </section>

      <MainThreadLane />
    </main>
  );
}
