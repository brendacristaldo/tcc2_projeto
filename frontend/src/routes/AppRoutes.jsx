
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';

import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Movimentacoes from '../pages/Movimentacoes';
import MovimentacaoDetalhes from '../pages/MovimentacaoDetalhes';
import NovaEntrada from '../pages/NovaEntrada';
import NovaSaida from '../pages/NovaSaida';
import Eventos from '../pages/Eventos';
import Relatorios from '../pages/Relatorios';
import PastorDashboard from '../pages/PastorDashboard';
import Usuarios from '../pages/Usuarios';
import Grupos from '../pages/Grupos';
import AtribuirTesoureiros from '../pages/AtribuirTesoureiros';
import Auditoria from '../pages/Auditoria';

import RotaProtegida from '../components/RotaProtegida';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota pública */}
        <Route path="/login" element={<Login />} />

        {/* Rotas para usuários autenticados */}
        <Route element={<RotaProtegida />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/movimentacoes" element={<Movimentacoes />} />
          <Route path="/movimentacoes/nova-entrada" element={<NovaEntrada />} />
          <Route path="/movimentacoes/nova-saida" element={<NovaSaida />} />
          <Route path="/movimentacoes/:id" element={<MovimentacaoDetalhes />} />
          <Route path="/eventos" element={<Eventos />} />
          <Route path="/relatorios" element={<Relatorios />} />
        </Route>

        {/* Rotas exclusivas do pastor */}
        <Route element={<RotaProtegida perfisPermitidos={['pastor']} />}>
          <Route path="/pastor/dashboard" element={<PastorDashboard />} />
          <Route path="/pastor/usuarios" element={<Usuarios />} />
          <Route path="/pastor/grupos" element={<Grupos />} />
          <Route path="/pastor/atribuir-tesoureiros" element={<AtribuirTesoureiros />} />
          <Route path="/pastor/auditoria" element={<Auditoria />} />
        </Route>

        {/* Qualquer rota inexistente volta ao login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
