import { createClient } from '@/lib/supabase/client';
import { GoldSilverPrice } from '@/types';

const GOLD_API_URL = 'https://api.metals.live/v1/spot/gold';
const SILVER_API_URL = 'https://api.metals.live/v1/spot/silver';
const EXCHANGE_RATE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

/**
 * Fetch current gold price in USD per gram
 */
async function fetchGoldPriceUSD(): Promise<number> {
    try {
        const response = await fetch(GOLD_API_URL);
        const data = await response.json();
        // API returns price per ounce, convert to per gram
        const pricePerOunce = data.price || data[0]?.price;
        if (!pricePerOunce) throw new Error('Invalid gold price response');
        return pricePerOunce / 31.1035; // 1 ounce = 31.1035 grams
    } catch (error) {
        console.error('Error fetching gold price:', error);
        // Fallback to approximate value if API fails
        return 65; // Approximate USD per gram
    }
}

/**
 * Fetch current silver price in USD per gram
 */
async function fetchSilverPriceUSD(): Promise<number> {
    try {
        const response = await fetch(SILVER_API_URL);
        const data = await response.json();
        // API returns price per ounce, convert to per gram
        const pricePerOunce = data.price || data[0]?.price;
        if (!pricePerOunce) throw new Error('Invalid silver price response');
        return pricePerOunce / 31.1035; // 1 ounce = 31.1035 grams
    } catch (error) {
        console.error('Error fetching silver price:', error);
        // Fallback to approximate value if API fails
        return 0.85; // Approximate USD per gram
    }
}

/**
 * Fetch USD to INR exchange rate
 */
async function fetchExchangeRate(): Promise<number> {
    try {
        const response = await fetch(EXCHANGE_RATE_API_URL);
        const data = await response.json();
        return data.rates?.INR || 83; // Fallback to approximate rate
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        return 83; // Approximate USD to INR rate
    }
}

/**
 * Get or fetch today's gold and silver prices
 * Caches prices daily in database using RPC function
 */
export async function getGoldSilverPrices(
    date: string = new Date().toISOString().split('T')[0]
): Promise<GoldSilverPrice> {
    const supabase = createClient();

    // Check if we have cached prices for today
    const { data: cached } = await supabase
        .from('gold_silver_prices')
        .select('*')
        .eq('date', date)
        .maybeSingle();

    if (cached) {
        return cached;
    }

    // Fetch fresh prices
    const [goldPriceUSD, silverPriceUSD, exchangeRate] = await Promise.all([
        fetchGoldPriceUSD(),
        fetchSilverPriceUSD(),
        fetchExchangeRate(),
    ]);

    // Store in cache using RPC function
    const { data: priceId, error } = await supabase.rpc('upsert_gold_silver_prices', {
        p_date: date,
        p_gold_price_per_gram_usd: goldPriceUSD,
        p_silver_price_per_gram_usd: silverPriceUSD,
        p_exchange_rate_usd_to_inr: exchangeRate,
    });

    if (error) {
        console.error('Error caching prices:', error);
        // Return approximate values if caching fails
        return {
            id: '',
            date,
            gold_price_per_gram_usd: goldPriceUSD,
            silver_price_per_gram_usd: silverPriceUSD,
            exchange_rate_usd_to_inr: exchangeRate,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
    }

    // Fetch the created record
    const { data: newPrice } = await supabase
        .from('gold_silver_prices')
        .select('*')
        .eq('id', priceId)
        .single();

    return newPrice || {
        id: priceId,
        date,
        gold_price_per_gram_usd: goldPriceUSD,
        silver_price_per_gram_usd: silverPriceUSD,
        exchange_rate_usd_to_inr: exchangeRate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
}

/**
 * Calculate Nisab threshold based on type
 * Silver Nisab: 612.36 grams (87.48 tola)
 * Gold Nisab: 87.48 grams (7.5 tola)
 */
export function calculateNisabThreshold(
    nisabType: 'silver' | 'gold',
    goldPricePerGramINR: number,
    silverPricePerGramINR: number
): number {
    const SILVER_NISAB_GRAMS = 612.36;
    const GOLD_NISAB_GRAMS = 87.48;

    if (nisabType === 'silver') {
        return SILVER_NISAB_GRAMS * silverPricePerGramINR;
    } else {
        return GOLD_NISAB_GRAMS * goldPricePerGramINR;
    }
}