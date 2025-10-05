import type { VideoSource } from 'expo-video';

export interface SafetyVideo {
  id: string;
  title: string;
  description: string;
  source: VideoSource; // local asset or remote URL
  category: 'equipment' | 'procedures' | 'emergency' | 'general';
  language: string;
  thumbnailUrl?: string;
  tags: string[];
}

export const SAFETY_VIDEOS: SafetyVideo[] = [
  {
    id: 'video-1',
    title: 'PPE Inspection and Usage',
    description: 'Learn how to properly inspect and use personal protective equipment in mining environments.',
    source: require('../assets/videos/video_1.mp4'),
    category: 'equipment',
    language: 'English',
    tags: ['PPE', 'safety gear', 'inspection', 'hard hat', 'safety glasses']
  },
  {
    id: 'video-2',
    title: 'Emergency Evacuation Procedures',
    description: 'Step-by-step guide for emergency evacuation procedures in underground mining.',
    source: require('../assets/videos/video_2.mp4'),
    category: 'emergency',
    language: 'Hindi',
    tags: ['evacuation', 'emergency', 'procedures', 'underground', 'safety routes']
  },
  {
    id: 'video-3',
    title: 'Electrical Safety in Mining',
    description: 'Essential electrical safety practices for mining operations and equipment handling.',
    source: require('../assets/videos/video_3.mp4'),
    category: 'equipment',
    language: 'Hindi',
    tags: ['electrical', 'lockout', 'tagout', 'LOTO', 'electrical hazards']
  },
  {
    id: 'video-4',
    title: 'Hazard Recognition and Reporting',
    description: 'How to identify, assess, and report potential hazards in the workplace.',
    source: require('../assets/videos/video_4.mp4'),
    category: 'procedures',
    language: 'Hindi',
    tags: ['hazard', 'identification', 'reporting', 'risk assessment', 'workplace safety']
  },
  {
    id: 'video-5',
    title: 'Gas Detection and Monitoring',
    description: 'Understanding gas detection systems and personal monitoring devices.',
    source: require('../assets/videos/video_5.mp4'),
    category: 'equipment',
    language: 'Hindi',
    tags: ['gas detection', 'monitoring', 'atmospheric hazards', 'ventilation', 'gas meters']
  }
];

export const getVideosByCategory = (category: SafetyVideo['category']): SafetyVideo[] => {
  return SAFETY_VIDEOS.filter(video => video.category === category);
};

export const getRandomVideo = (): SafetyVideo => {
  const randomIndex = Math.floor(Math.random() * SAFETY_VIDEOS.length);
  return SAFETY_VIDEOS[randomIndex];
};

export const getDailyVideo = (): SafetyVideo => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const videoIndex = dayOfYear % SAFETY_VIDEOS.length;
  return SAFETY_VIDEOS[videoIndex];
};