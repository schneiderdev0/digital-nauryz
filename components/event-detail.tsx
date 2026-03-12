import type { AppLocale } from "@/lib/locale";
import { EventDefinition } from "@/lib/types";

const eventFeatureMap: Record<AppLocale, Record<string, string[]>> = {
  ru: {
    "day-14-meetings": [
      "Автоматическое назначение случайной пары",
      "Встроенный чат для поиска партнера на площадке",
      "Подтверждение встречи одним сканированием QR",
      "Перевыдача пары пользователем и админом"
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
      "Иллюстрации элементов национальной одежды",
      "Выбор правильного названия из нескольких вариантов",
      "Итоговый результат и рейтинг участников"
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
  },
  kk: {
    "day-14-meetings": [
      "Кездейсоқ жұпты автоматты түрде тағайындау",
      "Алаңда серікті табуға арналған кіріктірілген чат",
      "Кездесуді бір QR сканерлеумен растау",
      "Жұпты пайдаланушы мен админ арқылы қайта беру"
    ],
    "day-15-kindness": [
      "Белсенді пайдаланушылар тізімі",
      "Ашықхат үлгісі мен мәтінін таңдау",
      "10 ашықхат лимиті және realtime есептегіш"
    ],
    "day-16-culture": [
      "Сұрақтар пулы және әр сұраққа таймер",
      "Дұрыс жауаптар бойынша ұпайды есептеу",
      "Нәтижелер экраны және топ-10"
    ],
    "day-17-family": [
      "6 қатысушыға дейін топ құру",
      "Қосылуға арналған шақыру сілтемесі мен QR",
      "Ортақ шаңырақты жасап, экспорттау"
    ],
    "day-18-outfit": [
      "Ұлттық киім элементтерінің иллюстрациялары",
      "Бірнеше нұсқадан дұрыс атауды таңдау",
      "Қорытынды нәтиже және қатысушылар рейтингі"
    ],
    "day-19-renewal": [
      "Жылға мақсат енгізу",
      "Ағаш бейнеленген жеке карточка жасау",
      "Нәтижені жүктеп алу және жіберу"
    ],
    "day-20-sports": [
      "PvP матч және solo режим",
      "Жарысты WebSocket арқылы синхрондау",
      "Таймер, таптар және жеңімпаз экраны"
    ]
  }
};

export function EventDetail({
  event,
  locale = "ru"
}: {
  event: EventDefinition;
  locale?: AppLocale;
}) {
  const features = eventFeatureMap[locale][event.slug] ?? [];

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
        <h3 style={{ marginTop: 0 }}>
          {locale === "kk" ? "Іске асырудың базалық ауқымы" : "Базовый scope реализации"}
        </h3>
        <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
