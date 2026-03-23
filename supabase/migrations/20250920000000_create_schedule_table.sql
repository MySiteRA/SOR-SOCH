/*
  # Создание таблицы расписания (построчного)

  1. Новые таблицы
    - `schedule`
      - `id` (uuid, первичный ключ)
      - `class_id` (uuid, внешний ключ к классам)
      - `day_of_week` (text, день недели)
      - `lesson_number` (integer, номер урока)
      - `subject` (text, название предмета)
      - `teacher` (text, имя учителя)
      - `room` (text, кабинет)
      - `start_time` (text, время начала)
      - `end_time` (text, время окончания)
      - `created_at` (timestamp)

  2. Безопасность
    - Включение RLS для таблицы `schedule`
    - Политики для публичного чтения
    - Политики для управления (анонимные и аутентифицированные пользователи, так как админка пока не требует входа)
*/

CREATE TABLE IF NOT EXISTS schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week text NOT NULL,
  lesson_number integer NOT NULL,
  subject text NOT NULL,
  teacher text,
  room text,
  start_time text,
  end_time text,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_schedule_class_id ON schedule(class_id);
CREATE INDEX IF NOT EXISTS idx_schedule_day_of_week ON schedule(day_of_week);

-- Политики доступа
CREATE POLICY "Public can read schedule"
  ON schedule
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow management of schedule"
  ON schedule
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
