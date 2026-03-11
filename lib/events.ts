import { EventDefinition } from "@/lib/types";

const baseEvents: EventDefinition[] = [
  {
    day: 14,
    dateLabel: "14 марта",
    slug: "day-14-meetings",
    title: "День встреч",
    subtitle: "Случайная пара и QR-подтверждение",
    description: "Получите случайную пару, найдите своего участника на площадке и подтвердите встречу, чтобы заработать очки.",
    pointsLabel: "+50 очков за успешную встречу",
    status: "upcoming",
    tags: ["matching", "qr", "realtime"]
  },
  {
    day: 15,
    dateLabel: "15 марта",
    slug: "day-15-kindness",
    title: "День доброты",
    subtitle: "Цифровые открытки",
    description: "Выберите участника, соберите цифровую открытку и отправьте доброе сообщение прямо в приложении.",
    pointsLabel: "+20 очков за первую открытку",
    status: "upcoming",
    tags: ["cards", "feed", "notifications"]
  },
  {
    day: 16,
    dateLabel: "16 марта",
    slug: "day-16-culture",
    title: "День культуры",
    subtitle: "Квиз 10-15 вопросов",
    description: "Пройдите квиз о культуре и традициях, отвечайте быстро и поднимайтесь в таблице лидеров.",
    pointsLabel: "Очки зависят от правильных ответов",
    status: "upcoming",
    tags: ["quiz", "timer", "leaderboard"]
  },
  {
    day: 17,
    dateLabel: "17 марта",
    slug: "day-17-family",
    title: "День семьи",
    subtitle: "Группа и Шанырак",
    description: "Соберите команду из шести человек, объединитесь в общий шанырак и получите совместную карточку.",
    pointsLabel: "+40 очков за завершённую группу",
    status: "upcoming",
    tags: ["groups", "share", "image"]
  },
  {
    day: 18,
    dateLabel: "18 марта",
    slug: "day-18-outfit",
    title: "День национальной одежды",
    subtitle: "Угадай элемент одежды",
    description: "Пройдите квиз по национальной одежде, угадывайте элементы по иллюстрациям и улучшайте свой результат в рейтинге.",
    pointsLabel: "+30 очков за первое прохождение",
    status: "upcoming",
    tags: ["quiz", "outfit", "leaderboard"]
  },
  {
    day: 19,
    dateLabel: "19 марта",
    slug: "day-19-renewal",
    title: "День обновления",
    subtitle: "Цифровое дерево",
    description: "Создайте свое цифровое дерево и запишите цель на год, чтобы сохранить ее в красивой карточке.",
    pointsLabel: "+25 очков за созданную карточку",
    status: "upcoming",
    tags: ["generator", "image", "goal"]
  },
  {
    day: 20,
    dateLabel: "20 марта",
    slug: "day-20-sports",
    title: "День национальных видов спорта",
    subtitle: "Гонка на лошадях",
    description: "Соревнуйтесь в гонке на лошадях, играйте соло или против другого участника и боритесь за лидерство.",
    pointsLabel: "+60 очков за победу в PvP",
    status: "upcoming",
    tags: ["clicker", "pvp", "websocket"]
  }
];

export function getEventDefinitions(): EventDefinition[] {
  return baseEvents.map((event) => {
    if (event.day < 14) {
      return { ...event, status: "completed" };
    }

    if (event.day === 14) {
      return { ...event, status: "active" };
    }

    return event;
  });
}
