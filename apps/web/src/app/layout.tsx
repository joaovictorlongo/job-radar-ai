import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Job Radar AI — Radar de Vagas & Inteligência de Carreira com IA',
  description:
    'Monitoramento de vagas com extração estruturada de LLM, grounding literal, RAG com pgvector, análise de gaps e harness de avaliação.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        {/* Navbar */}
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  Job Radar AI
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                  v0.1
                </span>
              </Link>
              <nav className="hidden md:flex space-x-6 text-sm font-medium">
                <Link
                  href="/"
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  Vagas & Matching
                </Link>
                <Link
                  href="/gaps"
                  className="text-slate-300 hover:text-white transition-colors flex items-center space-x-1"
                >
                  <span>Análise de Gaps</span>
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.2 rounded font-semibold">
                    Mercado
                  </span>
                </Link>
                <Link
                  href="/evals"
                  className="text-slate-300 hover:text-white transition-colors flex items-center space-x-1"
                >
                  <span>Avaliação de IA</span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.2 rounded font-semibold">
                    Evals
                  </span>
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-3 text-xs text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>PostgreSQL 16 + pgvector</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800 bg-slate-900/50 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4">
            <p>
              Job Radar AI — Sistema de AI Engineering desenvolvido por <strong>João Victor Longo</strong>.
            </p>
            <p className="mt-1">
              Contratos Zod • Grounding Literal • RAG com pgvector • Avaliação Sistemática (κ ≥ 0.80)
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
