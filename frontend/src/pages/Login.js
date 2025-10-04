import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Lock, User, Dumbbell } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await login(formData.username, formData.password);
    
    if (!result.success) {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-warm)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
              <span className="text-white font-bold text-2xl">KO</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Gestão Fitness</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Sistema de Gestão de Membership</p>
        </div>

        <Card className="border-0" style={{ boxShadow: 'var(--shadow-xl)', backgroundColor: 'var(--background-elevated)' }}>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center font-bold" style={{ color: 'var(--text-primary)' }}>Entrar no Sistema</CardTitle>
            <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
              Introduz as tuas credenciais para aceder
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Nome de Utilizador</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Inserir nome de utilizador"
                    value={formData.username}
                    onChange={handleChange}
                    className="pl-10"
                    required
                    data-testid="login-username"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Inserir password"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 pr-10"
                    required
                    data-testid="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    data-testid="toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full text-white py-6 text-lg font-medium ko-hover-primary transition-all duration-200"
                style={{ backgroundColor: 'var(--button-primary-bg)' }}
                disabled={loading}
                data-testid="login-submit"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    A entrar...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Credenciais:</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div><strong>Username:</strong> fabio.guerreiro</div>
                <div><strong>Password:</strong> admin123</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>&copy; 2025 Gestão Fitness. Sistema de gestão profissional.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;