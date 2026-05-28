import { Request, Response } from 'express';
import Country from '../../../models/Test/payments/Country';

// Single API: Get country data by name
export const getCountryData = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get country name from request body
    const { country } = req.body;

    // Check if country name is provided
    if (!country || typeof country !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Country name is required in request body'
      });
      return;
    }

    const countryName = country.trim();

    // Search for exact country name (case-insensitive)
    const countryData = await Country.findOne({
      name: { $regex: new RegExp(`^${countryName}$`, 'i') }
    });

    // If exact match not found, try partial match
    if (!countryData) {
      // Try to find similar countries
      const similarCountries = await Country.find({
        name: { $regex: countryName, $options: 'i' }
      }).limit(5).select('_id name currency symbol');

      if (similarCountries.length > 0) {
        res.status(200).json({
          success: true,
          message: 'Exact match not found. Did you mean one of these?',
          suggestions: similarCountries.map(c => ({
            code: c._id,
            name: c.name,
            currency: c.currency,
            symbol: c.symbol
          }))
        });
        return;
      }

      // No matches found
      res.status(404).json({
        success: false,
        message: `Country "${countryName}" not found`
      });
      return;
    }

    // Format response
    const response = {
      success: true,
      data: {
        country_code: countryData._id,
        country_name: countryData.name,
        currency: countryData.currency,
        currency_symbol: countryData.symbol,
        banks: countryData.banks.map(bank => ({
          bank_id: bank.id,
          bank_name: bank.name,
          bank_code: bank.code
        })),
        wallets: countryData.wallets.map(wallet => ({
          wallet_id: wallet.id,
          wallet_name: wallet.name,
          wallet_type: wallet.icon
        })),
        has_banks: countryData.banks.length > 0,
        has_wallets: countryData.wallets.length > 0,
        total_banks: countryData.banks.length,
        total_wallets: countryData.wallets.length
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching country data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};