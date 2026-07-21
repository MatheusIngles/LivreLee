import {
  ArrowLeft,
  Award,
  BookMarked,
  BookOpen,
  Bookmark,
  Brain,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Clock,
  Crown,
  Droplets,
  Eye,
  FileText,
  Flame,
  Gem,
  Globe,
  Hash,
  HelpCircle,
  Hourglass,
  Image as ImageIcon,
  Infinity as InfinityIcon,
  Library,
  Medal,
  MessageCircle,
  MessageSquareQuote,
  Moon,
  PenLine,
  Quote,
  RotateCcw,
  ScrollText,
  Share2,
  Shuffle,
  Smile,
  Sparkles,
  Sprout,
  Star,
  Tag,
  Target,
  TrendingUp,
  Trophy,
  User,
  UserSearch,
  Users,
  Zap,
  ZoomIn,
  type LucideIcon,
} from "lucide-react";

/**
 * Ícones da interface (biblioteca lucide-react) — usados para navegação,
 * cabeçalhos e identidade de cada modo/conquista, no lugar de emoji "cru" de
 * sistema. O emoji de cada modo (mode.emoji) continua existindo nos dados
 * porque é usado como conteúdo (texto de compartilhamento), mas a UI usa
 * estes ícones para uma aparência consistente entre plataformas.
 */

export {
  ArrowLeft,
  Trophy,
  Globe,
  Zap,
  CheckCircle2,
  Flame,
  Award,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Share2,
  TrendingUp,
};

export const MODE_ICONS: Record<string, LucideIcon> = {
  daily: Calendar,
  unlimited: InfinityIcon,
  age: Hourglass,
  pages: FileText,
  sales: TrendingUp,
  quote: Quote,
  opening: BookOpen,
  closing: BookMarked,
  "character-quote": MessageCircle,
  character: User,
  "book-by-character": Users,
  chapter: Bookmark,
  adaptation: Clapperboard,
  emoji: Smile,
  synopsis: ScrollText,
  tags: Tag,
  timeline: Clock,
  cover: ZoomIn,
  blur: Droplets,
  silhouette: Moon,
  author: PenLine,
  "author-guess": UserSearch,
  mixed: Shuffle,
};

export const GROUP_ICONS: Record<string, LucideIcon> = {
  comparação: Target,
  frases: Quote,
  livro: Library,
  "outras-pistas": HelpCircle,
  capa: ImageIcon,
  autor: PenLine,
  especial: Sparkles,
};

export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  "primeiro-acerto": Sprout,
  "primeira-vitoria-diaria": CalendarCheck,
  "primeiro-modo": CheckCircle2,
  "acertos-10": Hash,
  "acertos-50": Medal,
  "acertos-100": Award,
  "acertos-500": Trophy,
  "acertos-1000": Crown,
  "streak-7": Flame,
  "streak-30": Star,
  "streak-100": Gem,
  "acertos-seguidos-20": Zap,
  "de-primeira": Target,
  "sem-dicas": Brain,
  "so-pela-frase": MessageSquareQuote,
  "so-pelos-emojis": Smile,
  "capa-primeiro-zoom": Eye,
  "todos-os-modos": Trophy,
};

export function ModeIcon({ id, className }: { id: string; className?: string }) {
  const Icon = MODE_ICONS[id] ?? Sparkles;
  return <Icon className={className} />;
}

export function GroupIcon({ group, className }: { group: string; className?: string }) {
  const Icon = GROUP_ICONS[group] ?? Sparkles;
  return <Icon className={className} />;
}

export function AchievementIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = ACHIEVEMENT_ICONS[slug] ?? Award;
  return <Icon className={className} />;
}
