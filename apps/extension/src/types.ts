export interface VideoInfo {
  channel: string;
  url: string;
  title: string;
}

export interface ScanMessage {
  type: 'SCAN_PLAYLIST';
}

export interface ScanResponse {
  type: 'SCAN_RESULT';
  videos: VideoInfo[];
  error?: string;
}

export interface GetCurrentVideoInfoMessage {
  type: 'GET_CURRENT_VIDEO_INFO';
}

export interface CurrentVideoInfoResponse {
  type: 'CURRENT_VIDEO_INFO';
  title: string;
  channel: string;
  error?: string;
}

