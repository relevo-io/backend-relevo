import { Schema, model, Types } from 'mongoose';

export interface ICanvi {
  campo: string; // Nom del camp modificat
  valorAnterior: any; // Valor anterior del camp
  valorNuevo: any; // Nou valor del camp
}

export interface IHistorial {
  ofertaId: Types.ObjectId;
  fecha: Date;
  canvis: ICanvi[]; // Vector de canvis realitzats
}

const historialSchema = new Schema<IHistorial>({
  ofertaId: {
    type: Schema.Types.ObjectId,
    ref: 'Oferta',
    required: true
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  canvis: [
    {
      campo: { type: String, required: true },
      valorAnterior: { type: Schema.Types.Mixed },
      valorNuevo: { type: Schema.Types.Mixed }
    }
  ]
});

export default model<IHistorial>('Historial', historialSchema);
