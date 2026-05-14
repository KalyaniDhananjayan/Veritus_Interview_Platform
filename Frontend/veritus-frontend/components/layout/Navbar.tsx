import Link from 'next/link';
import { BrainCircuit, History } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-1.5 rounded-lg">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold tracking-wider text-lg">VERITUS</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/history" className="text-sm text-zinc-400 hover:text-white flex items-center gap-2 transition-colors">
            <History className="w-4 h-4" />
            <span>History</span>
          </Link>
          <Link href="/interview/domain" className="text-sm font-medium bg-white text-black px-4 py-2 rounded-full hover:bg-zinc-200 transition-colors">
            Start Interview
          </Link>
        </div>
      </div>
    </nav>
  );
}
