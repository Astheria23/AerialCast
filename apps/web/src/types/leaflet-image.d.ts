declare module 'leaflet-image' {
  import type { Map } from 'leaflet';

  type LeafletImageCallback = (error: Error | null, canvas: HTMLCanvasElement | null) => void;

  export default function leafletImage(map: Map, callback: LeafletImageCallback): void;
}
