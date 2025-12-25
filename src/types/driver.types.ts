export interface LoadDetails {
  id: string;
  loadNumber: string;
  chassisNumber?: string;
  containerNumber?: string;
  sealNumber?: string;
  pickupLocation: Location | Location[];
  deliveryLocation: Location | Location[];
  status: LoadStatus;
  documents: Document[];
  estimatedDistance?: string;
  estimatedTime?: string;
  chassis?: {
    id: string;
    chassisNumber: string;
  };
  loadType?: string;
  route?: string;
  driverDecision?: string;
  routing?: Array<{
    id: string;
    events: Event[];
  }>;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  terminal?: boolean;
  kind?: 'pickup' | 'delivery';
}

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  required: boolean;
  uploaded: boolean;
  url?: string;
  uploadedAt?: Date;
  uploadData?: {
    key: string;
    url: string;
    originalName: string;
    bucket: string;
    mimeType: string;
    size: number;
  };
}

export enum DocumentType {
  PROOF_OF_DELIVERY = 'proof_of_delivery',
  BILL_OF_LADING = 'bill_of_lading',
  INSPECTION_REPORT = 'inspection_report',
  PHOTO = 'photo',
  OTHER = 'other',
  TIR_OUT = 'tirOut',
  TIR_IN = 'tirIn',
}

export enum LoadStatus {
  AVAILABLE = 'available',
  ASSIGNED = 'assigned',
  ACCEPTED = 'accepted',
  ENROUTE_PICKUP = 'enroute_pickup',
  AT_PICKUP = 'at_pickup',
  LOADED = 'loaded',
  ENROUTE_DELIVERY = 'enroute_delivery',
  AT_DELIVERY = 'at_delivery',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  IN_PROGRESS = 'in_progress',
  PENDING = 'PENDING',
}

export interface Event {
  id: string;
  type: string;
  status: 'PENDING' | 'ARRIVED' | 'DEPARTED';
  location: string;
  sequence: number;
  createdAt?: string;
  arrivedAt?: string;
  created?: boolean;
}

export interface DriverProfile {
  id: string;
  name: string;
  licenseNumber: string;
  phone: string;
  email: string;
  currentTruck?: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
}

export interface NavigationItem {
  label: string;
  icon: any;
  path: string;
  active?: boolean;
}

