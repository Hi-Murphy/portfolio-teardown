# T013 — slow-class measurement (home-composition.yml run 43428424056)

Slow class = every Lighthouse benchmarkIndex in [1,900, 2,600] (S11.8 D1). Probe mode for live: `--expect live-loop` (R7/D-A4).

s1: - benchmarkIndex min-max: 2691.5-2921
s1: - slow-class [1900, 2600]: FAIL
s1: 
s1: ### Eager probes
s1: 
s1: | Condition | Runs | Result |
s1: |---|---:|---|
s1: | live | 2/2 | PASS |
s1: | reduced-motion | 2/2 | PASS |
s1: | save-data | 2/2 | PASS |

s2: - benchmarkIndex min-max: 2198-2349
s2: - slow-class [1900, 2600]: PASS
s2: 
s2: ### Eager probes
s2: 
s2: | Condition | Runs | Result |
s2: |---|---:|---|
s2: | live | 2/2 | PASS |
s2: | reduced-motion | 2/2 | PASS |
s2: | save-data | 2/2 | PASS |

s3: - benchmarkIndex min-max: 2644.5-2895.5
s3: - slow-class [1900, 2600]: FAIL
s3: 
s3: ### Eager probes
s3: 
s3: | Condition | Runs | Result |
s3: |---|---:|---|
s3: | live | 2/2 | PASS |
s3: | reduced-motion | 2/2 | PASS |
s3: | save-data | 2/2 | PASS |

Qualifying attempt: **s2** (index 2,198–2,349). Live reveal on s2: run 1 ready 567.9 ms / revealed 578.3 ms; run 2 ready 515.0 ms / revealed 525.8 ms (deadline 2,500 ms). Reduced motion 2/2 poster, Save-Data 2/2 poster. s1 and s3 are not slow class (informational, all probes PASS).
