# LogInput Auto-Save/Auto-Update Behavior Audit

## 🚨 **CRITICAL FINDINGS - Unwanted Auto-Behavior During User Interaction**

### **1. AGGRESSIVE AUTO-SAVE INTERVAL (10 seconds)**
**Location**: `LogInput.tsx` lines 85-92
```typescript
// Auto-save draft every 10 seconds for new entries
if (!initialData) {
  const interval = setInterval(() => {
    saveDraft(formData); // ⚠️ SAVES EVERY 10 SECONDS REGARDLESS OF USER ACTIVITY
  }, 10000);
  return () => clearInterval(interval);
}
```
**Issue**: Auto-saves every 10 seconds even when user is actively typing/interacting
**Expected**: Should only auto-save during inactivity or adverse conditions

### **2. DEBOUNCED VALIDATION TRIGGERING CONSTANT UPDATES**
**Location**: `LogInput.tsx` lines 62-63, 130-170
```typescript
const debouncedFormData = useDebounce(formData, 150); // ⚠️ 150ms debounce
// Multiple useEffect hooks trigger on debouncedFormData changes
```
**Issue**: Every keystroke triggers validation updates after 150ms delay
**Expected**: Validation should be on blur/submit, not during typing

### **3. IMMEDIATE FIELD VALIDATION ON EVERY CHANGE**
**Location**: `LogInput.tsx` lines 172-178
```typescript
const updateField = useCallback((field: keyof typeof formData, val: any) => {
  triggerHaptic(); // ⚠️ HAPTIC ON EVERY CHANGE
  setFormData(p => ({ ...p, [field]: val }));
  
  // Mark field as touched immediately for better UX
  setValidationState(prev => ({ // ⚠️ IMMEDIATE VALIDATION STATE UPDATE
    ...prev,
    [field]: { ...prev[field], touched: true }
  }));
}, []);
```
**Issue**: Every field change triggers immediate validation and haptic feedback
**Expected**: Should validate on blur, not on every keystroke

### **4. SMART DEFAULTS RECALCULATION ON EVERY RENDER**
**Location**: `LogInput.tsx` lines 38-39
```typescript
const smartDefaults = useMemo(() => calculateSmartDefaults(history), [history]);
```
**Issue**: Recalculates defaults whenever history changes (which happens frequently)
**Expected**: Should only calculate once on component mount

### **5. FORM PERSISTENCE LOADING ON MOUNT**
**Location**: `LogInput.tsx` lines 78-84
```typescript
// Load draft on mount for new entries
if (!initialData && hasDraft()) {
  const draft = loadDraft();
  if (draft) {
    setFormData(draft.data); // ⚠️ AUTO-LOADS DRAFT WITHOUT USER CONSENT
  }
}
```
**Issue**: Automatically loads draft data without asking user
**Expected**: Should prompt user before loading draft

## 🔧 **RECOMMENDED FIXES**

### **Fix 1: Replace Aggressive Auto-Save with Inactivity-Based Save**
```typescript
// Replace 10-second interval with inactivity detection
useEffect(() => {
  if (!initialData) {
    let inactivityTimer: NodeJS.Timeout;
    
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        saveDraft(formData); // Only save after 2 minutes of inactivity
      }, 120000); // 2 minutes
    };
    
    // Reset timer on any form interaction
    const handleActivity = () => resetTimer();
    document.addEventListener('keydown', handleActivity);
    document.addEventListener('click', handleActivity);
    
    return () => {
      clearTimeout(inactivityTimer);
      document.removeEventListener('keydown', handleActivity);
      document.removeEventListener('click', handleActivity);
    };
  }
}, [formData, initialData]);
```

### **Fix 2: Remove Debounced Validation During Typing**
```typescript
// Remove debouncedFormData and validate only on blur
const handleFieldBlur = useCallback((field: string, value: any) => {
  // Validate only when user stops interacting with field
  const validation = validateField(field, value);
  setValidationState(prev => ({
    ...prev,
    [field]: {
      isValid: validation.isValid,
      error: validation.error,
      touched: true
    }
  }));
}, []);
```

### **Fix 3: Remove Immediate Haptic Feedback**
```typescript
const updateField = useCallback((field: keyof typeof formData, val: any) => {
  // Remove triggerHaptic() - only trigger on submit/save
  setFormData(p => ({ ...p, [field]: val }));
  // Don't mark as touched immediately - only on blur
}, []);
```

### **Fix 4: Prompt User for Draft Loading**
```typescript
// Ask user before loading draft
useEffect(() => {
  if (!initialData && hasDraft()) {
    const shouldLoad = window.confirm("Resume previous draft?");
    if (shouldLoad) {
      const draft = loadDraft();
      if (draft) setFormData(draft.data);
    } else {
      clearDraft();
    }
  }
}, [initialData]);
```

## 🎯 **SUMMARY**
The LogInput component has **5 critical auto-behavior issues** that cause unwanted updates during user interaction:

1. **10-second auto-save** regardless of user activity
2. **150ms debounced validation** on every keystroke  
3. **Immediate field validation** and haptic feedback
4. **Smart defaults recalculation** on every render
5. **Automatic draft loading** without user consent

**Solution**: Implement inactivity-based auto-save, blur-based validation, and user-prompted draft loading.