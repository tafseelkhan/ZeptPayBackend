// src/controllers/apiKey/updatePermissions.ts
import { Request, Response } from 'express';
import ApiKey from '../../../models/Test/ApiKeys';
import User from '../../../models/auth/User'; // 🔹 User model import

// 🔹 Update API key permissions - SIMPLE VERSION
export const updateApiKeyPermissions = async (req: Request, res: Response) => {
  try {
    console.log('📝 updateApiKeyPermissions called with params:', req.params);
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    
    const { apiKeyId } = req.params;
    const updates = req.body;

    console.log('🔍 Finding API key with ID:', apiKeyId);
    const apiKey = await ApiKey.findById(apiKeyId);
    
    if (!apiKey) {
      console.log('❌ API key not found for ID:', apiKeyId);
      return res.status(404).json({ message: 'API key not found' });
    }

    console.log('✅ API key found:');
    console.log('🔑 Current permissions in DB:', JSON.stringify(apiKey.permissions, null, 2));

    // 🔒 Live mode protection
    if (apiKey.mode === 'live') {
      console.log('🔒 Live mode API key - checking permissions...');
      
      // Check if payouts or connect are being enabled
      if (updates.payouts?.enabled === true || updates.connect?.enabled === true) {
        console.log('⛔ Blocked: Payouts/Connect permissions attempted in live mode');
        return res.status(403).json({
          message: 'Payouts / Connect require bank agreement approval',
        });
      }
      console.log('✅ Live mode permissions check passed');
    }

    // 🔄 Simple merge - updates directly apply to permissions
    console.log('🔄 Applying updates to permissions...');
    
    // Recursive function to merge updates
    const applyUpdates = (target: any, source: any) => {
      Object.keys(source).forEach(key => {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          // If target doesn't have this key, create it
          if (!target[key]) target[key] = {};
          // Recursively apply nested updates
          applyUpdates(target[key], source[key]);
        } else {
          // Directly set the value
          target[key] = source[key];
        }
      });
    };

    // Apply all updates
    applyUpdates(apiKey.permissions, updates);
    
    console.log('📊 Updated permissions:', JSON.stringify(apiKey.permissions, null, 2));

    // Mark as modified and save
    apiKey.markModified('permissions');
    
    console.log('💾 Saving to database...');
    const savedApiKey = await apiKey.save();
    
    console.log('✅ Save completed successfully!');

    res.json({
      message: 'Permissions updated successfully',
      apiKey: savedApiKey,
    });
    
  } catch (error: any) {
    console.error('❌ updateApiKeyPermissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🔹 Fetch API keys for front-end based on user.isLive
export const getUserApiKeys = async (req: Request, res: Response) => {
  try {
    console.log('🔹 getUserApiKeys called');

    const userId = req.user!.id;
    console.log('🆔 Current userId from token:', userId);

    // 🔹 Find user
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found for userId:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ User found:', {
      id: user._id,
      name: user.name,
      isDeveloper: user.isDeveloper,
      isLive: user.isLive,
    });

    // 🔹 Decide mode
    const mode = user.isLive ? 'live' : 'test';
    console.log('🎯 Using API key mode:', mode);

    // ✅ FETCH ALL KEYS (active + inactive)
    const keys = await ApiKey.find({
      userId,
      mode,
    });

    console.log(`🔑 Found ${keys.length} API keys for mode "${mode}"`);
    console.log('📦 Sending FULL API keys to front-end:', keys);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        isDeveloper: user.isDeveloper,
        isLive: user.isLive,
      },
      keys, // ✅ active + inactive, full data
    });
  } catch (err) {
    console.error('❌ getUserApiKeys error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const toggleApiKeyStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { apiKeyId } = req.params;
    let { isActive } = req.body;

    console.log('🔹 Toggle API Key called');
    console.log('🆔 userId:', userId);
    console.log('🔑 apiKeyId:', apiKeyId);
    console.log('📦 Raw body:', req.body);

    // ✅ Normalize isActive (true/false OR "true"/"false")
    if (typeof isActive === 'string') {
      isActive = isActive.toLowerCase() === 'true';
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        message: 'isActive must be true or false',
      });
    }

    console.log('🎯 Final isActive value:', isActive);

    // 🔍 Find API key (ownership check)
    const apiKey = await ApiKey.findOne({
      _id: apiKeyId,
      userId,
    });

    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found' });
    }

    // 🔥 If activating → deactivate other keys of SAME MODE
    if (isActive === true) {
      await ApiKey.updateMany(
        {
          userId,
          mode: apiKey.mode,
          _id: { $ne: apiKey._id },
        },
        { isActive: false }
      );

      console.log(`⚠️ Other ${apiKey.mode} keys deactivated`);
    }

    // ✅ Update current key
    apiKey.isActive = isActive;
    await apiKey.save();

    console.log('✅ API key status updated:', {
      id: apiKey._id,
      mode: apiKey.mode,
      isActive: apiKey.isActive,
    });

    res.json({
      success: true,
      message: `API key ${isActive ? 'activated' : 'deactivated'} successfully`,
      apiKey,
    });
  } catch (error) {
    console.error('❌ toggleApiKeyStatus error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
