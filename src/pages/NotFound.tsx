import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
      <p className="text-muted-foreground mb-6">Página não encontrada</p>
      <Button onClick={() => navigate("/")} className="gradient-primary text-primary-foreground gap-2">
        <Home className="h-4 w-4" />
        Voltar ao início
      </Button>
    </div>
  );
};

export default NotFound;
