import { Canvas } from '@react-three/fiber';

// The one canvas for every zoom level. Content arrives from task 2.4 on.
export default function Scene() {
  return (
    <Canvas>
      <color attach="background" args={['#000']} />
    </Canvas>
  );
}
