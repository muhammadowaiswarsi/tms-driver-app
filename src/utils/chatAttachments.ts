import { customAxios } from '../services/api';

export type ChatAttachmentUpload = {
  key: string;
  url: string;
  presignedUrl?: string;
  originalName: string;
  mimeType: string;
  size: number;
};

export type ChatAttachmentPayload = {
  type: 'TEXT' | 'IMAGE' | 'FILE';
  attachmentUrl: string;
  attachmentName: string;
  attachmentMimeType: string;
};

export const getMessageTypeFromMime = (mimeType?: string): 'IMAGE' | 'FILE' => {
  if (mimeType?.startsWith('image/')) return 'IMAGE';
  return 'FILE';
};

export const buildAttachmentPayload = (upload: ChatAttachmentUpload): ChatAttachmentPayload => ({
  type: getMessageTypeFromMime(upload.mimeType),
  attachmentUrl: upload.presignedUrl || upload.url,
  attachmentName: upload.originalName,
  attachmentMimeType: upload.mimeType,
});

export const canSendChatMessage = (text: string, hasAttachment: boolean) =>
  Boolean(text.trim() || hasAttachment);

export const uploadChatAttachment = async (file: {
  uri: string;
  name?: string;
  mimeType?: string;
}): Promise<ChatAttachmentUpload> => {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    type: file.mimeType || 'application/octet-stream',
    name: file.name || `attachment_${Date.now()}`,
  } as any);

  const customFileName = `${Date.now()}_${file.name || 'attachment'}`;

  const response = await customAxios.post('/upload/single', formData, {
    params: {
      folder: 'chat-attachments',
      customFileName,
    },
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  const uploaded = response.data?.data || response.data;
  if (!uploaded?.url && !uploaded?.presignedUrl) {
    throw new Error('Failed to upload attachment');
  }

  return uploaded;
};

export const getAttachmentDisplayUrl = (message: {
  attachmentUrl?: string | null;
  presignedUrl?: string | null;
}) => message?.presignedUrl || message?.attachmentUrl || '';
