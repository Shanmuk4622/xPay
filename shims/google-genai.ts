export class GoogleGenAI {
  constructor(config?: any) {
    this.config = config || {};
  }
  async generate(input?: any) {
    return { output: 'stubbed response', input };
  }
}

export const Modality = {
  TEXT: 'text',
  IMAGE: 'image'
};

export const Type = {
  TEXT: 'text',
  IMAGE: 'image'
};

export default GoogleGenAI;
