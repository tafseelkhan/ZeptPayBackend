import mongoose, { Schema } from 'mongoose';

// Bank
interface IBank {
  id: string;
  name: string;
  code: string;
}

// Wallet
interface IWallet {
  id: string;
  name: string;
  icon: string;
}

// Country (PLAIN interface)
export interface ICountry {
  _id: string; // "IN", "US"
  name: string;
  currency: string;
  symbol: string;
  banks: IBank[];
  wallets: IWallet[];
  createdAt?: Date;
  updatedAt?: Date;
}

const BankSchema = new Schema<IBank>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
});

const WalletSchema = new Schema<IWallet>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  icon: { type: String, required: true },
});

const CountrySchema = new Schema<ICountry>(
  {
    _id: { type: String, required: true }, // country code
    name: { type: String, required: true },
    currency: { type: String, required: true },
    symbol: { type: String, required: true },
    banks: [BankSchema],
    wallets: [WalletSchema],
  },
  {
    timestamps: true,
    _id: false, // VERY IMPORTANT
  }
);

// ✅ FINAL MODEL
const Country = mongoose.model<ICountry>(
  'Country',
  CountrySchema,
  'countries'
);

export default Country;
