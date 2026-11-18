import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="font-display text-7xl font-extrabold text-muted">404</p>
      <h1 className="mt-4 text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        O endereço que você tentou abrir não existe ou foi movido.
      </p>
      <Link to="/" className="mt-6">
        <Button>
          <ArrowLeft className="h-4 w-4" /> Voltar ao início
        </Button>
      </Link>
    </div>
  );
}
