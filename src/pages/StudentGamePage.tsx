import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, Crown, X, AlertTriangle, Shuffle, Settings, Plus, Minus } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import FirebaseTruthOrDareGame from '../components/games/FirebaseTruthOrDareGame';
import FirebaseQuizGame from '../components/games/FirebaseQuizGame';
import FirebaseMafiaGame from '../components/games/FirebaseMafiaGame';
import { checkStudentKeyValidity } from '../lib/api';
import { 
  joinGame,
  leaveGame,
  startGame,
  cancelGame,
  subscribeToGame,
  subscribeToGamePlayers,
  updateGameSettings,
  validateGameSettings,
  getGameTypeName,
  type FirebaseGame,
  type FirebasePlayer
} from '../services/firebaseGameService';
import type { Student } from '../lib/supabase';

interface GameSettings {
  // Для мафии
  mafia?: number;
  doctor?: number;
  detective?: number;
  // Для правды или действия
  anonymity?: boolean;
  // Для викторины
  difficulty?: 'easy' | 'medium' | 'hard';
}

export default function StudentGamePage() {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  
  const [student, setStudent] = useState<Student | null>(location.state?.student || null);
  const [className, setClassName] = useState<string>(location.state?.className || '');
  
  const [game, setGame] = useState<FirebaseGame | null>(null);
  const [players, setPlayers] = useState<{ [userId: string]: FirebasePlayer }>({});
  const [isJoined, setIsJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    mafia: 1,
    doctor: 1,
    detective: 1,
    anonymity: true
  });
  const [settingsLoading, setSettingsLoading] = useState(false);



  const validateStudentKey = useCallback(async (studentId: string) => {
    try {
      const isValid = await checkStudentKeyValidity(studentId);
      
      if (!isValid) {
        // Ключ больше не валиден, принудительно разлогиниваем
        localStorage.removeItem('studentDashboardData');
        localStorage.removeItem('studentId');
        localStorage.removeItem('createdAt');
        localStorage.setItem('skipAutoLogin', 'true');
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Error validating student key:', error);
      // В случае ошибки проверки, не разлогиниваем
    }
  }, [navigate]);

  // Загружаем настройки игры при инициализации
  useEffect(() => {
    if (game?.settings) {
      setGameSettings(prev => ({ ...prev, ...game.settings }));
    }
  }, [game?.settings, setGameSettings]);

  const setupSubscriptions = useCallback(() => {
    if (!gameId) return;

    let unsubscribeGame: (() => void) | null = null;
    let unsubscribePlayers: (() => void) | null = null;

    // Подписываемся на игру
    unsubscribeGame = subscribeToGame(gameId, (gameData) => {
      if (gameData) {
        setGame(gameData);
        setLoading(false);
        
        // Если игра отменена, показываем сообщение и возвращаемся
        if (gameData.status === 'cancelled') {
          setError('Игра была отменена создателем');
          setTimeout(() => {
            navigate('/student-games', { replace: true });
          }, 3000);
        }
      } else {
        setError('Игра не найдена');
        setLoading(false);
      }
    });

    // Подписываемся на обновления игроков
    unsubscribePlayers = subscribeToGamePlayers(gameId, (playersData) => {
      setPlayers(playersData);
      if (student) {
        const playerJoined = Object.keys(playersData).includes(student.id);
        setIsJoined(playerJoined);
      }
    });

    return () => {
      if (unsubscribeGame) unsubscribeGame();
      if (unsubscribePlayers) unsubscribePlayers();
    };
  }, [gameId, student, navigate]);

  useEffect(() => {
    if (!student) {
      const saved = localStorage.getItem('studentDashboardData');
      if (saved) {
        const data = JSON.parse(saved);
        setStudent(data.student);
        setClassName(data.className);
      } else {
        navigate('/student-games', { replace: true });
        return;
      }
    }

    if (!gameId) {
      navigate('/student-games', { replace: true });
      return;
    }

    // Проверяем валидность ключа студента
    if (student) {
      validateStudentKey(student.id);
    }

    setupSubscriptions();
  }, [gameId, student, navigate, setupSubscriptions, validateStudentKey]);

  const handleSettingsUpdate = async () => {
    if (!gameId || !game) return;

    try {
      setSettingsLoading(true);
      
      // Валидация для мафии
      if (game.gameType === 'mafia') {
        const playerCount = Object.keys(players).length;
        const validation = validateGameSettings(playerCount, {
          mafia: gameSettings.mafia || 1,
          doctor: gameSettings.doctor || 1,
          detective: gameSettings.detective || 1
        });
        
        if (!validation.valid) {
          setError(validation.error || 'Неверные настройки');
          return;
        }
      }
      
      await updateGameSettings(gameId, gameSettings);
      setShowSettings(false);
      
    } catch (error) {
      console.error('Error updating settings:', error);
      setError('Ошибка обновления настроек');
    } finally {
      setSettingsLoading(false);
    }
  };
  const handleJoinGame = async () => {
    if (!gameId || !student || isJoined || !game) return;
    
    // Проверяем, не превышен ли лимит игроков
    const currentPlayerCount = Object.keys(players).length;
    if (currentPlayerCount >= game.maxPlayers) {
      setError('Игра заполнена');
      return;
    }

    try {
      setActionLoading('join');
      setError(null);
      await joinGame(gameId, student.id, student.name);
      setIsJoined(true);
    } catch (error) {
      console.error('Error joining game:', error);
      setError('Ошибка присоединения к игре');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeaveGame = async () => {
    if (!gameId || !student || !isJoined) return;

    try {
      setActionLoading('leave');
      setError(null);
      await leaveGame(gameId, student.id);
      setIsJoined(false);
    } catch (error) {
      console.error('Error leaving game:', error);
      setError('Ошибка выхода из игры');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartGame = async () => {
    if (!gameId || !game) return;

    try {
      setActionLoading('start');
      setError(null);
      
      await startGame(gameId);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка запуска игры');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelGame = async () => {
    if (!gameId || !game || !isGameCreator()) return;
    
    if (!confirm('Вы уверены, что хотите отменить игру? Все игроки будут уведомлены.')) {
      return;
    }

    try {
      setActionLoading('cancel');
      setError(null);
      await cancelGame(gameId);
    } catch (error) {
      console.error('Error cancelling game:', error);
      setError('Ошибка отмены игры');
    } finally {
      setActionLoading(null);
    }
  };

  const canStartGame = () => {
    return game?.creatorId === student?.id && 
           game?.status === 'waiting' && 
           Object.keys(players).length >= 2;
  };

  const isGameCreator = () => {
    return game?.creatorId === student?.id;
  };

  const getPlayerCount = (): number => {
    return Object.keys(players).length;
  };

  const getPlayersArray = () => {
    return Object.entries(players).map(([userId, player]) => ({
      userId,
      ...player
    }));
  };

  const renderGameSettings = () => {
    if (!game || !isGameCreator()) return null;

    return (
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Настройки игры
                  </h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-1 hover:bg-white/70 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Settings Content */}
              <div className="p-6 space-y-6">
                {/* Правда или Действие - Анонимность */}
                {game.gameType === 'truth_or_dare' && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Настройки анонимности</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Анонимные номера
                          </label>
                          <p className="text-xs text-gray-500">
                            Игроки видят только номера вместо имен
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={gameSettings.anonymity}
                            onChange={(e) => setGameSettings(prev => ({ ...prev, anonymity: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Мафия - Роли */}
                {game.gameType === 'mafia' && (
                  <div className="space-y-6">
                    {/* Анонимность для мафии */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-4">Настройки анонимности</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-700">
                              Анонимные номера
                            </label>
                            <p className="text-xs text-gray-500">
                              Игроки видят только номера вместо имен
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={gameSettings.anonymity}
                              onChange={(e) => setGameSettings(prev => ({ ...prev, anonymity: e.target.checked }))}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Распределение ролей */}
                    <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Распределение ролей</h4>
                    <div className="space-y-4">
                      {/* Мафия */}
                      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-red-900">Мафия</label>
                            <p className="text-xs text-red-700">Устраняют мирных жителей</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setGameSettings(prev => ({ ...prev, mafia: Math.max(1, (prev.mafia || 1) - 1) }))}
                              disabled={(gameSettings.mafia || 1) <= 1}
                              className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-lg font-bold text-red-900 w-6 text-center">
                              {gameSettings.mafia || 1}
                            </span>
                            <button
                              onClick={() => setGameSettings(prev => ({ ...prev, mafia: Math.min(3, (prev.mafia || 1) + 1) }))}
                              disabled={(gameSettings.mafia || 1) >= 3}
                              className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Врач */}
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-green-900">Врач</label>
                            <p className="text-xs text-green-700">Может спасти игрока ночью</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setGameSettings(prev => ({ ...prev, doctor: Math.max(0, (prev.doctor || 1) - 1) }))}
                              disabled={(gameSettings.doctor || 1) <= 0}
                              className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-lg font-bold text-green-900 w-6 text-center">
                              {gameSettings.doctor || 1}
                            </span>
                            <button
                              onClick={() => setGameSettings(prev => ({ ...prev, doctor: Math.min(1, (prev.doctor || 1) + 1) }))}
                              disabled={(gameSettings.doctor || 1) >= 1}
                              className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Детектив */}
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-blue-900">Детектив</label>
                            <p className="text-xs text-blue-700">Может проверить роль игрока</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setGameSettings(prev => ({ ...prev, detective: Math.max(0, (prev.detective || 1) - 1) }))}
                              disabled={(gameSettings.detective || 1) <= 0}
                              className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-lg font-bold text-blue-900 w-6 text-center">
                              {gameSettings.detective || 1}
                            </span>
                            <button
                              onClick={() => setGameSettings(prev => ({ ...prev, detective: Math.min(2, (prev.detective || 1) + 1) }))}
                              disabled={(gameSettings.detective || 1) >= 2}
                              className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Validation */}
                      {(() => {
                        const playerCount = Object.keys(players).length;
                        const validation = validateGameSettings(playerCount, {
                          mafia: gameSettings.mafia || 1,
                          doctor: gameSettings.doctor || 1,
                          detective: gameSettings.detective || 1
                        });
                        
                        return !validation.valid ? (
                          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                            <div className="flex items-center space-x-2">
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                              <span className="text-red-800 text-sm">{validation.error}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                            <div className="text-center text-sm text-green-800">
                              Мирных жителей: {playerCount - (gameSettings.mafia || 1) - (gameSettings.doctor || 1) - (gameSettings.detective || 1)}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    </div>
                  </div>
                )}

                {/* Викторина - Сложность */}
                {game.gameType === 'quiz' && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Уровень сложности</h4>
                    <div className="space-y-3">
                      {[
                        { value: 'easy', label: 'Легкий', desc: 'Простые вопросы, больше времени' },
                        { value: 'medium', label: 'Средний', desc: 'Стандартные вопросы и время' },
                        { value: 'hard', label: 'Сложный', desc: 'Сложные вопросы, меньше времени' }
                      ].map(option => (
                        <label
                          key={option.value}
                          className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            gameSettings.difficulty === option.value
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="difficulty"
                            value={option.value}
                            checked={gameSettings.difficulty === option.value}
                            onChange={(e) => setGameSettings(prev => ({ ...prev, difficulty: e.target.value as 'easy' | 'medium' | 'hard' }))}
                            className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{option.label}</div>
                            <div className="text-xs text-gray-600">{option.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="flex space-x-3">
                  <button
                    onClick={handleSettingsUpdate}
                    disabled={settingsLoading}
                    className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {settingsLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Сохранение...</span>
                      </div>
                    ) : (
                      'Сохранить настройки'
                    )}
                  </button>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };
  const renderGameComponent = () => {
    if (!game || !student) return null;

    switch (game.gameType) {
      case 'truth_or_dare':
        return (
          <FirebaseTruthOrDareGame
            game={game}
            players={players}
            currentPlayer={student}
            gameId={gameId!}
            onError={setError}
          />
        );
      case 'quiz':
        return (
          <FirebaseQuizGame
            game={game}
            players={players}
            currentPlayer={student}
            gameId={gameId!}
            onError={setError}
          />
        );
      case 'mafia':
        return (
          <FirebaseMafiaGame
            game={game}
            players={players}
            currentPlayer={student}
            gameId={gameId!}
            onError={setError}
          />
        );
      default:
        return <div>Неизвестный тип игры</div>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!game || !student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Игра не найдена</p>
          <button
            onClick={() => navigate('/student-games')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Вернуться к играм
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-safe">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.button
                onClick={() => navigate('/student-games')}
                whileHover={{ scale: 1.1, x: -5 }}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600 hover:text-indigo-600 transition-all font-bold"
              >
                <ArrowLeft className="w-6 h-6" />
              </motion.button>
              <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">
                  {game ? getGameTypeName(game.gameType) : 'Игра'}
                </h1>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                  {className}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-2xl flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-500" />
                <span className="font-black text-slate-700 text-sm">{getPlayerCount()}/{game?.maxPlayers || 0}</span>
              </div>
              
              <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
                game.status === 'waiting' 
                  ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                  : game.status === 'active'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : game.status === 'cancelled'
                      ? 'bg-rose-50 text-rose-600 border border-rose-100'
                    : 'bg-slate-50 text-slate-600 border border-slate-100'
              }`}>
                {game.status === 'waiting' && 'Ожидание'}
                {game.status === 'active' && 'В процессе'}
                {game.status === 'finished' && 'Завершена'}
                {game.status === 'cancelled' && 'Отменена'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl animate-card-appear pb-24 md:pb-12">
        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-200 flex items-center justify-between font-bold"
          >
            <div className="flex items-center">
               <AlertTriangle className="w-5 h-5 mr-3" />
               {error}
            </div>
            <button onClick={() => setError(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">✕</button>
          </motion.div>
        )}

        {/* Waiting Room */}
        {game.status === 'waiting' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="premium-card p-8 mb-8"
          >
            <div className="text-center">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Комната ожидания</h2>
                {isGameCreator() && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowSettings(true)}
                    className="flex items-center space-x-2 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 px-4 py-2 rounded-2xl transition-colors border border-slate-100"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">Настройки</span>
                  </motion.button>
                )}
              </div>
              <p className="text-slate-500 text-sm font-bold mb-6">
                Ожидаем игроков... ({getPlayerCount()}/{game.maxPlayers})
              </p>
              
              <div className="premium-card p-4 border-indigo-100 bg-indigo-50/50 mb-8">
                <div className="flex items-center justify-center space-x-2 text-indigo-700">
                  <Shuffle className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">
                    При старте игры всем игрокам будут назначены случайные номера
                    {game.gameType === 'truth_or_dare' && gameSettings.anonymity === false && ' (имена будут видны)'}
                  </span>
                </div>
              </div>

              {/* Players List */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {getPlayersArray().map((player, index) => (
                  <motion.div
                    key={player.userId}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="premium-card p-5 text-center group hover:border-indigo-200"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-indigo-200">
                      <span className="text-white font-black text-sm">
                        {player.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </span>
                    </div>
                    <p className="text-sm font-black text-slate-800 truncate tracking-tight">
                      {player.name}
                    </p>
                    {player.userId === game.creatorId && (
                      <Crown className="w-4 h-4 text-amber-500 mx-auto mt-1" />
                    )}
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                      Получит номер
                    </div>
                  </motion.div>
                ))}
                
                {/* Empty slots */}
                {Array.from({ length: game.maxPlayers - getPlayerCount() }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="premium-card p-5 text-center border-2 border-dashed border-slate-200 bg-slate-50/50"
                  >
                    <div className="w-14 h-14 bg-slate-100 rounded-[1.5rem] flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Свободно</p>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                {!isJoined ? (
                  <div className="space-y-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleJoinGame}
                      disabled={actionLoading === 'join' || getPlayerCount() >= game.maxPlayers}
                      className="w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-100 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {actionLoading === 'join' ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Присоединение...</span>
                        </div>
                      ) : getPlayerCount() >= game.maxPlayers ? (
                        'Игра заполнена'
                      ) : (
                        'Присоединиться к игре'
                      )}
                    </motion.button>
                  </div>
                ) : canStartGame() ? (
                  <div className="space-y-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleStartGame}
                      disabled={actionLoading === 'start'}
                      className="w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-100 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {actionLoading === 'start' ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Запуск...</span>
                        </div>
                      ) : (
                        'Начать игру'
                      )}
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCancelGame}
                      disabled={actionLoading === 'cancel'}
                      className="w-full py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {actionLoading === 'cancel' ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                          <span>Отмена...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <X className="w-4 h-4" />
                          <span>Отменить игру</span>
                        </div>
                      )}
                    </motion.button>
                  </div>
                ) : isJoined ? (
                  <div className="space-y-3">
                    <div className="text-slate-500 text-sm font-bold">
                      {getPlayerCount() < 2 
                        ? 'Ожидаем еще игроков...' 
                        : 'Ожидаем начала игры...'
                      }
                    </div>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleLeaveGame}
                      disabled={actionLoading === 'leave'}
                      className="w-full py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {actionLoading === 'leave' ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                          <span>Выход...</span>
                        </div>
                      ) : (
                        'Покинуть игру'
                      )}
                    </motion.button>
                  </div>
                ) : (
                  <div className="text-slate-500 text-sm font-bold">
                    {getPlayerCount() < 2 
                      ? 'Ожидаем еще игроков...' 
                      : 'Ожидаем начала игры...'
                    }
                  </div>
                )}
                
                {/* Cancel button for creator */}
                {isGameCreator() && !canStartGame() && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCancelGame}
                    disabled={actionLoading === 'cancel'}
                    className="w-full py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {actionLoading === 'cancel' ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                        <span>Отмена...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <X className="w-4 h-4" />
                        <span>Отменить игру</span>
                      </div>
                    )}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Game Content */}
        {game.status === 'active' && isJoined && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {renderGameComponent()}
          </motion.div>
        )}

        {/* Game Cancelled */}
        {game.status === 'cancelled' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="premium-card p-8 text-center border-rose-100"
          >
            <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Игра отменена</h2>
            <p className="text-slate-500 text-sm font-bold mb-8">Создатель игры отменил её</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/student-games')}
              className="px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-100 hover:shadow-2xl transition-all"
            >
              Вернуться к играм
            </motion.button>
          </motion.div>
        )}
        {/* Game Finished */}
        {game.status === 'finished' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="premium-card p-8 text-center"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-5xl">🏆</div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Игра завершена!</h2>
            <p className="text-slate-500 text-sm font-bold mb-8">Спасибо за участие в игре</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/student-games')}
              className="px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-100 hover:shadow-2xl transition-all"
            >
              Вернуться к играм
            </motion.button>
          </motion.div>
        )}

        {/* Game Settings Modal */}
        {renderGameSettings()}
      </div>
    </div>
  );
}