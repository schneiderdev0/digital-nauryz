import { EventDefinition } from "@/lib/types";

const eventFeatureMap: Record<string, string[]> = {
  "day-14-meetings": [
    "Автоматическое назначение случайной пары",
    "QR-подтверждение встречи с двух сторон",
    "Пересоздание пары пользователем и админом"
  ],
  "day-15-kindness": [
    "Список активных пользователей",
    "Выбор шаблона открытки и текст",
    "Лимит 10 открыток и realtime-счётчик"
  ],
  "day-16-culture": [
    "Пул вопросов и таймер на каждый вопрос",
    "Подсчёт очков по правильным ответам",
    "Экран результатов и топ-10"
  ],
  "day-17-family": [
    "Создание группы до 6 участников",
    "Ссылка-приглашение и QR для вступления",
    "Генерация общего шанырака и экспорт"
  ],
  "day-18-outfit": [
    "Доступ к фронтальной камере",
    "FaceMesh и выбор 2D-маски",
    "Сохранение и шаринг снимка"
  ],
  "day-19-renewal": [
    "Ввод цели на год",
    "Генерация персональной карточки с деревом",
    "Скачивание и отправка результата"
  ],
  "day-20-sports": [
    "PvP-матч и solo режим",
    "Синхронизация гонки через WebSocket",
    "Таймер, тапы и экран победителя"
  ]
};

export function EventDetail({ event }: { event: EventDefinition }) {
  const features = eventFeatureMap[event.slug] ?? [];

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <div
        style={{
          padding: 18,
          borderRadius: 22,
          background: "var(--surface-strong)",
          border: "1px solid var(--line)",
          display: "grid",
          gap: 12
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <strong>{event.dateLabel}</strong>
          <span style={{ color: "var(--success)" }}>{event.pointsLabel}</span>
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 24 }}>{event.title}</h2>
          <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
            {event.description}
          </p>
        </div>
      </div>

      <div
        style={{
          padding: 18,
          borderRadius: 22,
          background: "var(--surface-strong)",
          border: "1px solid var(--line)"
        }}
      >
        <h3 style={{ marginTop: 0 }}>Базовый scope реализации</h3>
        <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
