import { Suspense, Component } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import HeroModel from './HeroModel';
import { Loader2, ArrowRight } from 'lucide-react';

class ErrorBoundary extends Component<{ children: React.ReactNode, fallback: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.error("3D Model failed to load:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function Loading() {
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <span className="text-xs font-bold uppercase tracking-widest">Carregando Modelo...</span>
      </div>
    </Html>
  );
}

function FallbackCube() {
    return (
        <mesh rotation={[0, 0, 0]}>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="#4f46e5" wireframe />
        </mesh>
    );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden">

      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Environment preset="city" />

          <ErrorBoundary fallback={<FallbackCube />}>
            <Suspense fallback={<Loading />}>
               <HeroModel />
            </Suspense>
          </ErrorBoundary>

          <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </div>

      {/* Overlay UI */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-center space-y-6 pointer-events-auto">
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-500 tracking-tighter">
            ZIA CRM
          </h1>
          <p className="text-slate-400 text-lg md:text-xl font-medium tracking-wide max-w-2xl mx-auto">
            O futuro da gestão empresarial com Inteligência Artificial.
          </p>

          <div className="pt-8">
            <button
                onClick={() => navigate('/platform')}
                className="group relative px-8 py-4 bg-indigo-600 text-white font-bold uppercase tracking-widest rounded-full overflow-hidden shadow-[0_0_40px_rgba(79,70,229,0.5)] hover:shadow-[0_0_60px_rgba(79,70,229,0.7)] transition-all transform hover:scale-105"
            >
                <span className="relative z-10 flex items-center">
                    Acessar Plataforma <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-white/20 transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
            </button>
          </div>
        </div>
      </div>

      {/* Footer / Decor */}
      <div className="absolute bottom-8 w-full text-center z-10 pointer-events-none">
         <p className="text-[10px] text-slate-600 uppercase tracking-[0.3em]">Omnisystem v4.0 • Enterprise Edition</p>
      </div>
    </div>
  );
}
