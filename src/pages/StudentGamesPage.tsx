import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  MoreVertical, 
  Trash2, 
  User as UserIcon, 
  Calendar, 
  MessageCircle, 
  Gamepad2, 
  Users, 
  Plus, 
  Loader2, 
  LogOut, 
  Crown 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { checkStudentKeyValidity } from '../lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { 
  createGame, 
  subscribeToActiveGames, 
  getGameTypeName, 
  getGameTypeIcon, 
  getPlayerNumber,
  type FirebaseGame 
} from '../services/firebaseGameService';
import type { Student } from '../lib/supabase';

const gameTypes = [
  {
    type: 'truth_or_dare' as const,
    name: 'Правда или Действие',
    description: 'Классическая игра с вопросами и заданиями',
    icon: '🎭',
    color: 'from-pink-500 to-rose-600',
    bgColor: 'bg-pink-100',
    textColor: 'text-pink-600'
  },
  {
    type: 'quiz' as const,
    name: 'Викторина',
    description: 'Интеллектуальная игра с вопросами',
    icon: '🎲',
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-600'
  },
  {
    type: 'mafia' as const,
    name: 'Мафия',
    description: 'Психологическая игра на выживание',
    icon: '🕵️',
    color: 'from-gray-700 to-gray-900',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700'
  }
];

export default function StudentGamesPage() {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<{student: Student, className: string} | null>(null);
  const [activeGames, setActiveGames] = useState<FirebaseGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingGame, setCreatingGame] = useState<string | null>(null);

  // 1) Load student data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('studentDashboardData');
    if (saved) {
      const data = JSON.parse(saved);
      setStudentData(data);
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  // 2) Once studentData is available, validate key and subscribe to games
  useEffect(() => {
    if (!studentData) return;

    // Validate key
    const validateKey = async () => {
      try {
        const isValid = await checkStudentKeyValidity(studentData.student.id);
        if (!isValid) {
          localStorage.removeItem('studentDashboardData');
          localStorage.removeItem('studentId');
          localStorage.removeItem('createdAt');
          localStorage.setItem('skipAutoLogin', 'true');
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.error('Error validating student key:', error);
      }
    };
    validateKey();

    // Subscribe to active games
    setLoading(true);
    setError(null);
    
    const unsubscribe = subscribeToActiveGames(studentData.student.class_id, (games) => {
      setActiveGames(games);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [studentData, navigate]);

  const handleCreateGame = async (gameType: 'truth_or_dare' | 'quiz' | 'mafia') => {
    if (!studentData) return;

    try {
      setCreatingGame(gameType);
      setError(null);

      const gameId = await createGame(
        studentData.student.class_id,
        studentData.student.id,
        studentData.student.name,
        gameType,
        10
      );

      navigate(`/student-game/${gameId}`, {
        state: {
          student: studentData.student,
          className: studentData.className
        }
      });
    } catch (error) {
      console.error('Error creating game:', error);
      setError('Ошибка создания игры');
    } finally {
      setCreatingGame(null);
    }
  };

  const handleJoinGame = (game: FirebaseGame) => {
    if (!studentData) return;

    navigate(`/student-game/${game.id}`, {
      state: {
        student: studentData.student,
        className: studentData.className
      }
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('studentDashboardData');
    navigate('/', { replace: true });
  };

  const handleForgetSession = () => {
    localStorage.removeItem('studentId');
    localStorage.removeItem('createdAt');
    localStorage.removeItem('studentDashboardData');
    localStorage.setItem('skipAutoLogin', 'true');
    navigate('/', { replace: true });
  };

  const handleProfileClick = () => {
    navigate('/student-profile');
  };

  const handleScheduleClick = () => {
    navigate('/student-schedule');
  };

  const handleChatClick = () => {
    navigate('/student-chat');
  };

  const getPlayerCount = (game: FirebaseGame): number => {
    return game.players ? Object.keys(game.players).length : 0;
  };

  const isPlayerInGame = (game: FirebaseGame): boolean => {
    return game.players && studentData ? 
      Object.keys(game.players).includes(studentData.student.id) : false;
  };

  const isGameCreator = (game: FirebaseGame): boolean => {
    return studentData ? game.creatorId === studentData.student.id : false;
  };

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Только что';
    if (minutes < 60) return `${minutes} мин. назад`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ч. назад`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (!studentData || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.button
                onClick={() => navigate('/student-dashboard')}
                whileHover={{ scale: 1.1, x: -5 }}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600 hover:text-indigo-600 transition-all font-bold"
              >
                <ArrowLeft className="w-6 h-6" />
              </motion.button>
              <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1 flex items-center">
                  <Gamepad2 className="w-5 h-5 mr-2 text-indigo-600" />
                  Игротека
                </h1>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                  {studentData.className}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600 hover:text-indigo-600 transition-all font-bold"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </motion.button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-2 glass border-none shadow-2xl p-2 rounded-2xl overflow-hidden" asChild>
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <DropdownMenuItem onClick={handleProfileClick} className="flex items-center p-3 rounded-xl cursor-pointer hover:bg-white/50 transition-colors">
                      <UserIcon className="w-4 h-4 mr-3 text-indigo-500" />
                      <span className="font-bold text-slate-700">Профиль</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleScheduleClick} className="flex items-center p-3 rounded-xl cursor-pointer hover:bg-white/50 transition-colors">
                      <Calendar className="w-4 h-4 mr-3 text-blue-500" />
                      <span className="font-bold text-slate-700">Расписание</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleChatClick} className="flex items-center p-3 rounded-xl cursor-pointer hover:bg-white/50 transition-colors">
                      <MessageCircle className="w-4 h-4 mr-3 text-teal-500" />
                      <span className="font-bold text-slate-700">Чат класса</span>
                    </DropdownMenuItem>
                    <div className="h-px bg-slate-100 my-2 mx-2"></div>
                    <DropdownMenuItem onClick={handleForgetSession} className="flex items-center p-3 rounded-xl cursor-pointer hover:bg-rose-50 transition-colors group">
                      <Trash2 className="w-4 h-4 mr-3 text-rose-400 group-hover:text-rose-600" />
                      <span className="font-bold text-slate-600 group-hover:text-rose-600">Забыть сеанс</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="flex items-center p-3 rounded-xl cursor-pointer hover:bg-rose-50 transition-colors group">
                      <LogOut className="w-4 h-4 mr-3 text-rose-400 group-hover:text-rose-600" />
                      <span className="font-bold text-slate-600 group-hover:text-rose-600">Выйти</span>
                    </DropdownMenuItem>
                  </motion.div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl animate-card-appear">
        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-200 flex items-center justify-between font-bold"
          >
            <div className="flex items-center">
               <Trash2 className="w-5 h-5 mr-3" />
               {error}
            </div>
            <button onClick={() => setError(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">✕</button>
          </motion.div>
        )}

        {/* Active Games Bento */}
        {activeGames.length > 0 && (
          <div className="mb-12">
            <div className="mb-6 flex items-end justify-between">
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Live</p>
                 <h2 className="text-2xl font-black text-slate-800 tracking-tight">Активные игры</h2>
              </div>
              <div className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest animate-pulse">
                 {activeGames.length} {activeGames.length === 1 ? 'игра' : 'игры'} идёт
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activeGames.map((game, index) => {
                const playerCount = getPlayerCount(game);
                const isInGame = isPlayerInGame(game);
                const isCreator = isGameCreator(game);
                const currentPlayerNumber = isInGame ? getPlayerNumber(game.players || {}, studentData.student.id) : 0;

                return (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleJoinGame(game)}
                    className="premium-card p-6 cursor-pointer group hover:border-indigo-200 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-[1.5rem] flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300 shadow-sm">
                          {getGameTypeIcon(game.gameType)}
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-800 leading-none mb-1">
                            {getGameTypeName(game.gameType)}
                          </h3>
                          <div className="flex items-center space-x-2">
                             <span className={`text-[10px] font-black uppercase tracking-widest ${game.status === 'waiting' ? 'text-amber-500' : 'text-emerald-500'}`}>
                                {game.status === 'waiting' ? 'Ожидание' : 'В процессе'}
                             </span>
                             {isCreator && <Crown className="w-3 h-3 text-amber-500 shadow-sm" />}
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-2xl flex items-center space-x-2">
                        <Users className="w-4 h-4 text-indigo-500" />
                        <span className="font-black text-slate-700 text-sm">{playerCount}/{game.maxPlayers}</span>
                      </div>
                    </div>

                    <div className="h-px bg-slate-100 w-full mb-6"></div>

                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-3">
                        {game.players && Object.entries(game.players).slice(0, 5).map(([userId, player], idx) => (
                           <div
                             key={userId}
                             className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center border-4 border-white text-white text-[10px] font-black uppercase tracking-tighter"
                             style={{ zIndex: 10 - idx }}
                           >
                             {player.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                           </div>
                        ))}
                        {playerCount > 5 && (
                           <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center border-4 border-white text-slate-400 text-[10px] font-black" style={{ zIndex: 1 }}>
                              +{playerCount - 5}
                           </div>
                        )}
                      </div>
                      
                      <button className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${
                         isInGame ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white'
                      }`}>
                         {isInGame ? 'Вернуться' : 'Присоединиться'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Create Game Section */}
        <div className="mb-12">
          <div className="mb-8">
             <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Новая сессия</p>
             <h2 className="text-3xl font-black text-slate-800 tracking-tight">Создать свою игру</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {gameTypes.map((gameType, index) => (
              <motion.div
                key={gameType.type}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="premium-card p-8 group relative overflow-hidden text-center hover:border-indigo-100 transition-all duration-300 flex flex-col items-center"
              >
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gameType.color} opacity-10 blur-3xl -mr-12 -mt-12 group-hover:opacity-20 transition-opacity`}></div>
                
                <div className={`w-24 h-24 ${gameType.bgColor} rounded-[2rem] flex items-center justify-center text-5xl mb-6 shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                   {gameType.icon}
                </div>
                
                <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">{gameType.name}</h3>
                <p className="text-slate-500 text-xs font-bold leading-relaxed mb-6 flex-grow">{gameType.description}</p>
                
                <div className="w-full h-px bg-slate-50 mb-6"></div>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCreateGame(gameType.type)}
                  disabled={creatingGame === gameType.type}
                  className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl flex items-center justify-center space-x-2 ${
                    creatingGame === gameType.type ? 'bg-slate-100 text-slate-400' : `bg-gradient-to-r ${gameType.color} text-white shadow-indigo-100 hover:shadow-2xl`
                  }`}
                >
                  {creatingGame === gameType.type ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Создать стол</span>
                    </>
                  )}
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Rules Bento */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-12">
           <div className="md:col-span-12 mb-2">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Правила и особенности</h2>
           </div>
           
           <motion.div
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ delay: 0.4 }}
             className="md:col-span-4 premium-card p-6 bg-slate-900 text-white relative overflow-hidden group"
           >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 opacity-20 blur-3xl -mr-16 -mt-16 group-hover:opacity-30 transition-opacity"></div>
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl mb-4">🎭</div>
              <h4 className="text-lg font-black mb-2 tracking-tight">Анонимность</h4>
              <p className="text-slate-400 text-xs font-bold leading-relaxed">
                 При старте игры всем назначаются случайные номера. Никто не узнает, кто именно скрывается под маской Игрока №1.
              </p>
           </motion.div>

           <motion.div
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ delay: 0.5 }}
             className="md:col-span-4 premium-card p-6 border-indigo-100 bg-white group"
           >
              <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-2xl mb-4">💖</div>
              <h4 className="text-lg font-black text-slate-800 mb-2 tracking-tight">Правда или Действие</h4>
              <p className="text-slate-500 text-xs font-bold leading-relaxed">
                 Выбирайте "Правду" для каверзных вопросов или "Действие" для веселых заданий. Каждое решение транслируется в реальном времени.
              </p>
           </motion.div>

           <motion.div
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ delay: 0.6 }}
             className="md:col-span-4 premium-card p-6 border-indigo-100 bg-white group"
           >
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl mb-4">🏆</div>
              <h4 className="text-lg font-black text-slate-800 mb-2 tracking-tight">Викторина</h4>
              <p className="text-slate-500 text-xs font-bold leading-relaxed">
                 Кто быстрее всех ответит на вопросы? Зарабатывайте баллы, обгоняйте соперников и становитесь лидером класса.
              </p>
           </motion.div>

           <motion.div
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ delay: 0.7 }}
             className="md:col-span-12 premium-card p-8 bg-gradient-to-br from-indigo-600 to-purple-700 text-white relative overflow-hidden"
           >
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mb-32 -mr-32"></div>
              <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                 <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center text-6xl shadow-2xl">🕵️</div>
                 <div>
                    <h4 className="text-2xl font-black mb-2 tracking-tight">Мафия: Классика в новом формате</h4>
                    <p className="text-indigo-100 text-sm font-bold leading-relaxed max-w-2xl">
                       Психологическая дуэль в реальном времени. Врач лечит, детектив ищет, а Мафия пытается захватить город. Голосуйте анонимно и вычисляйте предателей по их действиям в чате игры.
                    </p>
                 </div>
              </div>
           </motion.div>
        </div>
      </div>
    </div>
  );
}