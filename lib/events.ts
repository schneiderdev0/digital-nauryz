import type { AppLocale } from "@/lib/locale";
import { EventDefinition } from "@/lib/types";

const EVENT_TIME_ZONE = "Asia/Almaty";

const localizedEvents = {
  ru: [
    {
      day: 14,
      dateLabel: "14 марта",
      slug: "day-14-meetings",
      title: "День встреч",
      subtitle: "Случайная пара, чат и QR",
      description: "Получите случайную пару, спишитесь в чате, найдите друг друга на площадке и подтвердите встречу одним сканированием QR.",
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
  ],
  kk: [
    {
      day: 14,
      dateLabel: "14 наурыз",
      slug: "day-14-meetings",
      title: "Кездесу күні",
      subtitle: "Кездейсоқ жұп, чат және QR",
      description: "Кездейсоқ жұп алып, чатта жазып, алаңда бір-біріңізді тауып, кездесуді бір QR сканерлеумен растаңыз.",
      pointsLabel: "Сәтті кездесу үшін +50 ұпай",
      status: "upcoming",
      tags: ["matching", "qr", "realtime"]
    },
    {
      day: 15,
      dateLabel: "15 наурыз",
      slug: "day-15-kindness",
      title: "Мейірім күні",
      subtitle: "Цифрлық ашықхаттар",
      description: "Қатысушыны таңдап, цифрлық ашықхат құрастырып, жылы хабарламаны қосымша ішінде жіберіңіз.",
      pointsLabel: "Алғашқы ашықхат үшін +20 ұпай",
      status: "upcoming",
      tags: ["cards", "feed", "notifications"]
    },
    {
      day: 16,
      dateLabel: "16 наурыз",
      slug: "day-16-culture",
      title: "Мәдениет күні",
      subtitle: "10-15 сұрақтан тұратын квиз",
      description: "Мәдениет пен дәстүрлер туралы квизден өтіп, тез жауап беріп, көшбасшылар кестесіне көтеріліңіз.",
      pointsLabel: "Ұпайлар дұрыс жауаптарға байланысты",
      status: "upcoming",
      tags: ["quiz", "timer", "leaderboard"]
    },
    {
      day: 17,
      dateLabel: "17 наурыз",
      slug: "day-17-family",
      title: "Отбасы күні",
      subtitle: "Топ және Шаңырақ",
      description: "Алты адамнан тұратын топ жинап, ортақ шаңыраққа бірігіп, бірлескен карточка алыңыз.",
      pointsLabel: "Аяқталған топ үшін +40 ұпай",
      status: "upcoming",
      tags: ["groups", "share", "image"]
    },
    {
      day: 18,
      dateLabel: "18 наурыз",
      slug: "day-18-outfit",
      title: "Ұлттық киім күні",
      subtitle: "Киім элементін тап",
      description: "Ұлттық киім туралы квизден өтіп, сурет бойынша элементтерді тауып, рейтингтегі нәтижеңізді жақсартыңыз.",
      pointsLabel: "Алғашқы өту үшін +30 ұпай",
      status: "upcoming",
      tags: ["quiz", "outfit", "leaderboard"]
    },
    {
      day: 19,
      dateLabel: "19 наурыз",
      slug: "day-19-renewal",
      title: "Жаңару күні",
      subtitle: "Цифрлық ағаш",
      description: "Әдемі карточкада сақтау үшін өзіңіздің цифрлық ағашыңызды жасап, жылға арналған мақсатыңызды жазыңыз.",
      pointsLabel: "Жасалған карточка үшін +25 ұпай",
      status: "upcoming",
      tags: ["generator", "image", "goal"]
    },
    {
      day: 20,
      dateLabel: "20 наурыз",
      slug: "day-20-sports",
      title: "Ұлттық спорт күні",
      subtitle: "Ат жарысы",
      description: "Ат жарысында жарысып, жеке немесе басқа қатысушымен ойнап, көшбасшылық үшін күресіңіз.",
      pointsLabel: "PvP жеңісі үшін +60 ұпай",
      status: "upcoming",
      tags: ["clicker", "pvp", "websocket"]
    }
  ]
} satisfies Record<AppLocale, EventDefinition[]>;

export function getEventDefinitions(locale: AppLocale = "ru"): EventDefinition[] {
  const baseEvents = localizedEvents[locale];
  const currentEventDay = getCurrentMarchDayInAlmaty();

  return baseEvents.map((event) => {
    if (currentEventDay < event.day) {
      return { ...event, status: "upcoming" };
    }

    if (currentEventDay === event.day) {
      return { ...event, status: "active" };
    }

    return { ...event, status: "completed" };
  });
}

export function isEventUnlocked(day: number) {
  return getCurrentMarchDayInAlmaty() >= day;
}

function getCurrentMarchDayInAlmaty() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE,
    month: "2-digit",
    day: "2-digit"
  });

  const parts = formatter.formatToParts(new Date());
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "0");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");

  if (month < 3) {
    return 0;
  }

  if (month > 3) {
    return 31;
  }

  return day;
}
