import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { StoreProvider } from '@/lib/store';
import { PublicLayout } from '@/components/PublicLayout';
import { AdminLayout } from '@/components/AdminLayout';
import Index from '@/pages/Index';
import Cadastro from '@/pages/Cadastro';
import Login from '@/pages/Login';
import { PainelLayout } from '@/pages/painel/PainelLayout';
import PainelHome from '@/pages/painel/Home';
import Treinamentos from '@/pages/painel/Treinamentos';
import TrilhaPage from '@/pages/painel/Trilha';
import Aula from '@/pages/painel/Aula';
import Dashboard from '@/pages/admin/Dashboard';
import Candidatos from '@/pages/admin/Candidatos';
import Solicitacoes from '@/pages/admin/Solicitacoes';
import Pipeline from '@/pages/admin/Pipeline';
import AdminTreinamentos from '@/pages/admin/Treinamentos';
import Ajustes from '@/pages/admin/Ajustes';
import ConteudoHome from '@/pages/admin/ConteudoHome';
import FluxoTreinamento from '@/pages/admin/FluxoTreinamento';
import Usuarios from '@/pages/admin/Usuarios';
import MinhaConta from '@/pages/admin/MinhaConta';
import NotFound from '@/pages/NotFound';

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo({ top: 0 });
  }, [pathname, hash]);

  return null;
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <ScrollToTop />
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/pre-cadastro" element={<Cadastro />} />
            <Route path="/login" element={<Login />} />
          </Route>

          <Route path="/painel" element={<PainelLayout />}>
            <Route index element={<PainelHome />} />
            <Route path="treinamentos" element={<Treinamentos />} />
            <Route path="treinamentos/:trilhaId" element={<TrilhaPage />} />
            <Route path="treinamentos/:trilhaId/:aulaId" element={<Aula />} />
          </Route>

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="candidatos" element={<Candidatos />} />
            <Route path="solicitacoes" element={<Solicitacoes />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="treinamentos" element={<AdminTreinamentos />} />
            <Route path="ajustes" element={<Ajustes />} />
            <Route path="conteudo-home" element={<ConteudoHome />} />
            <Route path="fluxo-treinamento" element={<FluxoTreinamento />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="minha-conta" element={<MinhaConta />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
