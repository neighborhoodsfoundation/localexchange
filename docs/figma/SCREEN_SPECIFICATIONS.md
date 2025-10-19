# LocalEx Figma Screen Specifications
*Detailed Screen-by-Screen Design Requirements*

**Version**: 1.0  
**Date**: January 19, 2025  
**Purpose**: Comprehensive screen specifications for Figma prototype

---

## 📱 **Onboarding Flow Screens**

### **Screen 1: Welcome Screen**
```
Layout: Full screen with centered content
Background: Gradient (#5C3D2E to #3D281F) (logo brown gradient)

Elements:
┌─────────────────────────────────────┐
│           [LocalEx Logo]            │
│                                     │
│         "Trade Locally,             │
│          Live Better"               │
│                                     │
│     [Beautiful hero illustration]   │
│                                     │
│    "Connect with neighbors to       │
│     buy, sell, and trade items      │
│     safely in your community"       │
│                                     │
│        [Get Started Button]         │
│                                     │
│     "Already have an account?       │
│            Sign In"                 │
│                                     │
│        [Privacy Notice]             │
│    "Your privacy is protected"      │
└─────────────────────────────────────┘

Specifications:
- Logo: 120px height, white
- Hero text: H1, white, centered
- Subtitle: 18px, white, centered
- Illustration: 200px height, centered
- Description: 16px, white, centered, 2 lines max
- Get Started button: Primary button (#5C3D2E), full width
- Sign In link: 16px, white with underline
- Privacy notice: 12px, white, centered
```

### **Screen 2: Registration Screen**
```
Layout: Standard form layout with header
Background: White

Elements:
┌─────────────────────────────────────┐
│ ← Back    Create Account            │
│                                     │
│    "Join LocalEx and start          │
│     trading in your community"      │
│                                     │
│  Email Address                      │
│  ┌─────────────────────────────────┐ │
│  │ user@example.com               │ │
│  └─────────────────────────────────┘ │
│                                     │
│  Password                           │
│  ┌─────────────────────────────────┐ │
│  │ •••••••••••••••••••••••••••••• │ │
│  └─────────────────────────────────┘ │
│                                     │
│  ☑ I agree to the Terms of Service │
│    and Privacy Policy              │
│                                     │
│        [Create Account]             │
│                                     │
│        [Sign In Instead]            │
└─────────────────────────────────────┘

Specifications:
- Header: Back button + title, 64px height
- Title: H2, centered
- Form fields: Standard input styling
- Password field: Show/hide toggle
- Checkbox: Custom styled checkbox
- Terms link: #5C3D2E (logo brown), underlined
- Create Account: Primary button (#5C3D2E), full width
- Sign In link: Secondary button (#5C3D2E), centered
```

### **Screen 3: Profile Setup Screen**
```
Layout: Form with profile photo upload
Background: White

Elements:
┌─────────────────────────────────────┐
│ ← Back    Complete Profile          │
│                                     │
│    "Tell us about yourself to       │
│     help other users trust you"     │
│                                     │
│           [Profile Photo]           │
│        "Tap to add photo"           │
│                                     │
│  Display Name                       │
│  ┌─────────────────────────────────┐ │
│  │ Alex_Chen                      │ │
│  └─────────────────────────────────┘ │
│                                     │
│  Location                           │
│  ┌─────────────────────────────────┐ │
│  │ Seattle, WA        [Location]  │ │
│  └─────────────────────────────────┘ │
│                                     │
│  Bio (Optional)                     │
│  ┌─────────────────────────────────┐ │
│  │ Tell others about yourself...  │ │
│  │                                 │ │
│  │                                 │ │
│  └─────────────────────────────────┘ │
│                                     │
│        [Complete Setup]             │
└─────────────────────────────────────┘

Specifications:
- Profile photo: 100px circle, dashed border
- Photo placeholder: Camera icon + text
- Display name: Auto-generated suggestion
- Location: GPS detection + manual entry
- Bio: Multi-line text area, optional
- Complete Setup: Primary button (#5C3D2E), full width
```

### **Screen 4: Tutorial Screen**
```
Layout: Carousel with 3 tutorial slides
Background: White

Elements:
┌─────────────────────────────────────┐
│              [Skip]                 │
│                                     │
│     [Tutorial Illustration]         │
│                                     │
│         "Discover Items"            │
│                                     │
│    "Browse thousands of items       │
│     from your neighbors. Find       │
│     exactly what you're looking     │
│     for with our smart search."     │
│                                     │
│        ● ○ ○                        │
│                                     │
│           [Next]                    │
└─────────────────────────────────────┘

Specifications:
- Skip button: Top right, 16px text
- Illustration: 200px height, centered
- Title: H2, centered
- Description: 16px, centered, 3 lines
- Dots: 3 dots indicating slide position
- Next button: Primary button (#5C3D2E), full width
- Last slide: "Get Started" button (#5C3D2E) instead of "Next"
```

---

## 🏠 **Main App Screens**

### **Screen 5: Home Dashboard**
```
Layout: Tab navigation with main content
Background: #F9FAFB

Elements:
┌─────────────────────────────────────┐
│ LocalEx    🔍    [Profile Avatar]   │
│                                     │
│    "Good morning, Alex!"            │
│                                     │
│  [Featured Items Carousel]          │
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │Item1│ │Item2│ │Item3│ →         │
│  └─────┘ └─────┘ └─────┘           │
│                                     │
│  [Quick Actions]                    │
│  ┌─────────────┐ ┌─────────────┐   │
│  │ [List Item] │ │ [My Trades] │   │
│  └─────────────┘ └─────────────┘   │
│                                     │
│  Recent Activity                    │
│  ┌─────────────────────────────────┐ │
│  │ 🎯 New offer on your iPhone    │ │
│  │ 📱 Your MacBook was viewed     │ │
│  │ ✅ Trade completed with Sarah  │ │
│  └─────────────────────────────────┘ │
│                                     │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐     │
│ │🏠 │ │🔍 │ │➕ │ │💬 │ │👤 │     │
│ └───┘ └───┘ └───┘ └───┘ └───┘     │
└─────────────────────────────────────┘

Specifications:
- Header: Logo + search icon + profile avatar
- Greeting: Personalized with user name
- Carousel: Horizontal scrollable items
- Quick actions: 2 prominent buttons
- Recent activity: List of recent actions
- Bottom navigation: 5 tabs with icons
```

### **Screen 6: Search/Discovery Screen**
```
Layout: Search interface with filters and results
Background: White

Elements:
┌─────────────────────────────────────┐
│ ← Back    Search Items              │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🔍 coffee table                │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Filters] [Sort] [Map View]         │
│                                     │
│ ┌─────┐ ┌─────┐ ┌─────┐           │
│ │Item1│ │Item2│ │Item3│           │
│ │$120 │ │$85  │ │$200 │           │
│ │1.2mi│ │0.8mi│ │2.1mi│           │
│ └─────┘ └─────┘ └─────┘           │
│                                     │
│ ┌─────┐ ┌─────┐ ┌─────┐           │
│ │Item4│ │Item5│ │Item6│           │
│ │$150 │ │$95  │ │$180 │           │
│ │1.5mi│ │3.2mi│ │0.9mi│           │
│ └─────┘ └─────┘ └─────┘           │
│                                     │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐     │
│ │🏠 │ │🔍 │ │➕ │ │💬 │ │👤 │     │
│ └───┘ └───┘ └───┘ └───┘ └───┘     │
└─────────────────────────────────────┘

Specifications:
- Search bar: Prominent with search icon
- Filter buttons: Horizontal scrollable
- Results: Grid layout, 2 columns
- Item cards: Image + title + price + distance
- Map view toggle: Switch between list/map
- Bottom navigation: Consistent across app
```

### **Screen 7: Item Listing Creation Screen**
```
Layout: Multi-step form with photo upload
Background: White

Elements:
┌─────────────────────────────────────┐
│ ← Back    List New Item             │
│                                     │
│  Step 1 of 3: Photos                │
│                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ 📷 │ │ 📷 │ │ 📷 │           │
│  └─────┘ └─────┘ └─────┘           │
│                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ 📷 │ │ 📷 │ │ 📷 │           │
│  └─────┘ └─────┘ └─────┘           │
│                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ 📷 │ │ 📷 │ │ 📷 │           │
│  └─────┘ └─────┘ └─────┘           │
│                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ 📷 │ │ 📷 │ │ 📷 │           │
│  └─────┘ └─────┘ └─────┘           │
│                                     │
│        [Continue to Details]        │
└─────────────────────────────────────┘

Specifications:
- Progress indicator: Step 1 of 3
- Photo grid: 3x4 grid of photo slots
- Photo slots: 80px squares, dashed border
- Add photo icon: Camera icon in center
- Continue button: Primary button, full width
- Photo limit: Up to 12 photos
```

### **Screen 8: Item Details Screen**
```
Layout: Full-screen item view with actions
Background: White

Elements:
┌─────────────────────────────────────┐
│ ← Back    Item Details    ⋮         │
│                                     │
│    [Photo Gallery - Swipeable]      │
│                                     │
│  Vintage Leather Jacket             │
│  $85 • Good Condition               │
│                                     │
│  📍 University District             │
│  📏 Size: Medium                    │
│  🏷️ Category: Clothing             │
│                                     │
│  Description                        │
│  Genuine leather jacket, size M.    │
│  Worn a few times, excellent        │
│  condition. Perfect for fall        │
│  weather.                           │
│                                     │
│  Seller Info                        │
│  ┌─────────────────────────────────┐ │
│  │ 👤 Alex_Chen    ⭐ 4.8 (23)    │ │
│  │ "Trusted seller, fast response" │ │
│  └─────────────────────────────────┘ │
│                                     │
│        [Make Offer]                 │
│      [Message Seller]               │
└─────────────────────────────────────┘

Specifications:
- Photo gallery: Full width, swipeable
- Item title: H2, bold
- Price and condition: H3, #8BC34A (logo green) for price
- Details: Icon + text format
- Description: Multi-line text
- Seller card: Profile photo + rating + bio
- Action buttons: Primary (#5C3D2E) and secondary (#5C3D2E) buttons
```

---

## 💬 **Trade Flow Screens**

### **Screen 9: Offer Creation Screen**
```
Layout: Form with item summary and offer input
Background: White

Elements:
┌─────────────────────────────────────┐
│ ← Back    Make Offer                │
│                                     │
│  Item Summary                       │
│  ┌─────────────────────────────────┐ │
│  │ [Item Photo] Vintage Leather    │ │
│  │         Jacket                  │ │
│  │         $85 • Good Condition    │ │
│  └─────────────────────────────────┘ │
│                                     │
│  Your Offer                         │
│  ┌─────────────────────────────────┐ │
│  │ $                               │ │
│  └─────────────────────────────────┘ │
│                                     │
│  Message to Seller (Optional)       │
│  ┌─────────────────────────────────┐ │
│  │ Hi! I'm interested in this      │ │
│  │ jacket. Would you accept $75?   │ │
│  │                                 │ │
│  └─────────────────────────────────┘ │
│                                     │
│  Offer Summary                      │
│  Item Price: $85                   │
│  Your Offer: $75                   │
│  Savings: $10                      │
│                                     │
│        [Send Offer]                 │
└─────────────────────────────────────┘

Specifications:
- Item summary: Compact card format
- Offer input: Large, prominent number input
- Message: Optional text area
- Offer summary: Clear breakdown of offer
- Send Offer: Primary button (#5C3D2E), full width
```

### **Screen 10: Negotiation Chat Screen**
```
Layout: Chat interface with offer messages
Background: White

Elements:
┌─────────────────────────────────────┐
│ ← Back    Alex_Chen    ⋮            │
│                                     │
│  [Chat Messages]                    │
│                                     │
│  [Offer Message Bubble]             │
│  ┌─────────────────────────────────┐ │
│  │ Your offer: $75                │ │
│  │ "Hi! I'm interested in this     │ │
│  │  jacket. Would you accept $75?" │ │
│  │ Sent 2 minutes ago              │ │
│  └─────────────────────────────────┘ │
│                                     │
│        [Counter Offer Info]         │
│  ┌─────────────────────────────────┐ │
│  │ Alex countered with $80         │ │
│  │ "That's a bit low. How about    │ │
│  │  $80?"                          │ │
│  │ 5 minutes ago                   │ │
│  └─────────────────────────────────┘ │
│                                     │
│  ┌─────────────────────────────────┐ │
│  │ Type a message...               │ │
│  │                          [Send] │ │
│  └─────────────────────────────────┘ │
│                                     │
│    [Accept $80] [Decline] [Counter] │
└─────────────────────────────────────┘

Specifications:
- Chat header: Back + seller name + menu
- Message bubbles: Differentiated by sender
- Offer messages: Special styling with price
- Counter offer: Highlighted with action buttons
- Message input: Text input + send button
- Action buttons: Accept, Decline, Counter
```

### **Screen 11: Payment Process Screen**
```
Layout: Payment form with escrow explanation
Background: White

Elements:
┌─────────────────────────────────────┐
│ ← Back    Complete Payment          │
│                                     │
│  Trade Summary                      │
│  ┌─────────────────────────────────┐ │
│  │ [Item Photo] Vintage Leather    │ │
│  │         Jacket                  │ │
│  │         $80 • Good Condition    │ │
│  │                                 │ │
│  │ Seller: Alex_Chen               │ │
│  │ Meeting: University District    │ │
│  │ Time: Tomorrow 2:00 PM          │ │
│  └─────────────────────────────────┘ │
│                                     │
│  Payment Breakdown                  │
│  Item Price: $80.00                │
│  Platform Fee: $1.99               │
│  ────────────────────────────────── │
│  Total: $81.99                     │
│                                     │
│  Payment Method                     │
│  ┌─────────────────────────────────┐ │
│  │ 💳 **** 4242 (Expires 12/25)   │ │
│  │                    [Change]     │ │
│  └─────────────────────────────────┘ │
│                                     │
│  [Escrow Protection Info]           │
│  💰 Your payment is held securely   │
│     until you confirm receipt       │
│                                     │
│        [Pay $81.99]                 │
└─────────────────────────────────────┘

Specifications:
- Trade summary: Complete trade details
- Payment breakdown: Clear fee structure
- Payment method: Saved card display
- Escrow explanation: Security assurance
- Pay button: Primary button (#5C3D2E) with total amount
```

### **Screen 12: Trade Completion Screen**
```
Layout: Meetup coordination and completion
Background: White

Elements:
┌─────────────────────────────────────┐
│ ← Back    Trade in Progress         │
│                                     │
│  Payment Complete! ✅               │
│                                     │
│  Meeting Details                    │
│  ┌─────────────────────────────────┐ │
│  │ 📍 Starbucks - University      │ │
│  │     District                   │ │
│  │ 🕐 Tomorrow, 2:00 PM           │ │
│  │ 📱 Alex will contact you       │ │
│  │     when they arrive           │ │
│  └─────────────────────────────────┘ │
│                                     │
│  What's Next?                       │
│  1. Alex will message you when      │
│     they're on their way            │
│  2. Meet at the agreed location     │
│  3. Inspect the item together       │
│  4. Confirm receipt in the app      │
│  5. Leave feedback for each other   │
│                                     │
│  [Message Alex] [View Trade Details]│
│                                     │
│  Need Help?                         │
│  [Contact Support] [Safety Tips]    │
└─────────────────────────────────────┘

Specifications:
- Success indicator: Checkmark + message
- Meeting details: Clear location and time
- Step-by-step guide: Numbered instructions
- Action buttons: Message seller, view details
- Help section: Support and safety links
```

### **Screen 13: Feedback Screen**
```
Layout: Rating and review form
Background: White

Elements:
┌─────────────────────────────────────┐
│ ← Back    Rate Your Trade           │
│                                     │
│  Trade Complete! 🎉                 │
│                                     │
│  How was your experience with       │
│  Alex_Chen?                         │
│                                     │
│  ⭐⭐⭐⭐⭐                        │
│                                     │
│  What went well?                    │
│  ┌─────────────────────────────────┐ │
│  │ Great communication, item was   │ │
│  │ exactly as described, smooth    │ │
│  │ transaction!                    │ │
│  │                                 │ │
│  └─────────────────────────────────┘ │
│                                     │
│  Would you trade with Alex again?   │
│  ┌─────────────────────────────────┐ │
│  │ Yes, definitely!                │ │
│  └─────────────────────────────────┘ │
│                                     │
│  [Submit Feedback]                  │
│                                     │
│  [Skip for Now]                     │
└─────────────────────────────────────┘

Specifications:
- Star rating: 5-star interactive rating
- Review text: Multi-line text area
- Recommendation: Yes/No question
- Submit button: Primary button (#5C3D2E), full width
- Skip option: Secondary button (#5C3D2E), centered
```

---

## 🔄 **Interactive Elements**

### **Navigation Patterns**
```
Bottom Navigation:
- Home: House icon, active state
- Search: Magnifying glass icon
- Add: Plus icon, prominent
- Messages: Chat bubble icon
- Profile: User avatar icon

Top Navigation:
- Back button: Left arrow, consistent
- Title: Screen name, centered
- Actions: Menu dots, share, etc.

Modal Navigation:
- Close button: X in top right
- Cancel button: Secondary button
- Confirm button: Primary button
```

### **Form Interactions**
```
Input Focus States:
- Border color change to blue
- Subtle shadow effect
- Label color change

Button States:
- Default: Primary color
- Hover: Slightly darker
- Active: Pressed effect
- Disabled: Grayed out

Photo Upload:
- Drag and drop area
- Tap to select
- Progress indicator
- Preview thumbnails
```

---

**🎯 These specifications provide the detailed requirements for creating a comprehensive and user-friendly Figma prototype that accurately represents the LocalEx user experience!**
