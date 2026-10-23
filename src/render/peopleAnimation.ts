import type { Bone } from 'three';
import type { PersonPose } from './peoplePoses';
/** Shared gestures with staggered timing; bags stay in the quieter right hand. */
export function animateFigure(
  b: Bone[],
  pose: PersonPose,
  time: number,
  actor: number,
) {
  b.forEach((bone) => {
    bone.rotation.set(0, 0, 0);
  });
  const t = time + actor * 1.7;
  const breath = Math.sin(t * 1.3);
  b[1]!.rotation.z = Math.sin(t * 0.55) * 0.025;
  b[2]!.rotation.y = Math.sin(t * 0.45) * 0.13;
  // Relaxed elbows, outward arms, and an asymmetric resting stance.
  b[3]!.rotation.z = -0.06;
  b[5]!.rotation.z = 0.06;
  b[4]!.rotation.x = -0.18;
  b[6]!.rotation.x = -0.08;
  b[7]!.rotation.x = 0.035;
  b[8]!.rotation.x = 0.06;
  b[1]!.rotation.x = breath * 0.012;
  if (pose.action === 'walk') {
    const phase = ((pose.distance ?? 0) * Math.PI * 2) / 0.72;
    const stride = Math.sin(phase) * Math.min(0.38, (pose.speed ?? 0) * 0.48);
    b[7]!.rotation.x = stride;
    b[9]!.rotation.x = -stride;
    b[8]!.rotation.x = Math.max(0, -stride) * 1.2;
    b[10]!.rotation.x = Math.max(0, stride) * 1.2;
    b[3]!.rotation.x = -stride * 0.65;
    b[5]!.rotation.x = stride * 0.15;
    b[1]!.rotation.y = Math.sin(phase) * 0.035;
  } else if (pose.action === 'reception') {
    // Alternate typing/checking the register and an open-handed indication.
    const gesture = t % 7 > 4.8;
    b[1]!.rotation.x = 0.08;
    b[3]!.rotation.x = -0.55;
    b[4]!.rotation.x = -0.65 + Math.sin(t * 4) * 0.06;
    b[5]!.rotation.x = gesture ? -0.85 : -0.5;
    b[6]!.rotation.x = gesture ? -0.25 : -0.7 + Math.sin(t * 4 + 1) * 0.06;
    b[5]!.rotation.z = gesture ? 0.25 : 0.06;
  } else if (pose.action === 'clean') {
    const sweep = Math.sin(t * 1.8);
    b[1]!.rotation.x = 0.19 + sweep * 0.035;
    b[1]!.rotation.y = sweep * 0.1;
    b[7]!.rotation.x = -0.12;
    b[8]!.rotation.x = 0.2;
    b[3]!.rotation.x = -0.6 + sweep * 0.12;
    b[4]!.rotation.x = -0.4;
    b[5]!.rotation.x = -0.25;
    b[6]!.rotation.x = -0.55;
    b[0]!.rotation.y = sweep * 0.05;
  } else if (pose.action === 'greet') {
    const lift = Math.max(0, Math.sin(t * 0.9));
    b[3]!.rotation.x = -0.25 - lift * 0.5;
    b[4]!.rotation.x = -0.45;
    b[2]!.rotation.x = lift * 0.08;
  } else if (pose.action === 'wait') {
    b[1]!.rotation.z = 0.04 + breath * 0.012;
    b[3]!.rotation.x = -0.12;
    b[4]!.rotation.x = -0.35;
    b[2]!.rotation.y = Math.sin(t * 0.35) * 0.22;
  }
}
