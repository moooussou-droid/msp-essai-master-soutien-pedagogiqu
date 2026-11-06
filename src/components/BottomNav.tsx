import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Calculator, BarChart3, Settings } from 'lucide-react';

interface BottomNavProps {
  classId?: string;
}

export default function BottomNav({ classId }: BottomNavProps) {
  const location = useLocation();
  
  // Don't show on certain screens
  const hideOnScreens = ['/settings', '/class/new'];
  if (hideOnScreens.some(path => location.pathname.startsWith(path))) {
    return null;
  }

  const baseClassPath = classId ? `/class/${classId}` : '';

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb">
      <div className="grid grid-cols-5 h-16">
        <Link
          to="/"
          className={`flex flex-col items-center justify-center gap-1 ${
            location.pathname === '/' ? 'text-emerald-600' : 'text-gray-500'
          }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs">Accueil</span>
        </Link>
        
        {classId && (
          <>
            <Link
              to={`${baseClassPath}/students`}
              className={`flex flex-col items-center justify-center gap-1 ${
                location.pathname.includes('/students') ? 'text-emerald-600' : 'text-gray-500'
              }`}
            >
              <Users className="w-6 h-6" />
              <span className="text-xs">Élèves</span>
            </Link>
            
            <Link
              to={`${baseClassPath}/entry`}
              className={`flex flex-col items-center justify-center gap-1 ${
                location.pathname.includes('/entry') ? 'text-emerald-600' : 'text-gray-500'
              }`}
            >
              <Calculator className="w-6 h-6" />
              <span className="text-xs">Notes</span>
            </Link>
            
            <Link
              to={`${baseClassPath}/statistics`}
              className={`flex flex-col items-center justify-center gap-1 ${
                location.pathname.includes('/statistics') ? 'text-emerald-600' : 'text-gray-500'
              }`}
            >
              <BarChart3 className="w-6 h-6" />
              <span className="text-xs">Stats</span>
            </Link>
          </>
        )}
        
        <Link
          to="/settings"
          className={`flex flex-col items-center justify-center gap-1 ${
            location.pathname === '/settings' ? 'text-emerald-600' : 'text-gray-500'
          }`}
        >
          <Settings className="w-6 h-6" />
          <span className="text-xs">Réglages</span>
        </Link>
      </div>
    </nav>
  );
}
