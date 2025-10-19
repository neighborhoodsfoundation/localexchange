# LocalEx Figma Prototype Setup Guide
*Rapid User Experience Validation Implementation*

**Version**: 1.0  
**Date**: January 19, 2025  
**Purpose**: Set up Figma prototype for user testing  
**Timeline**: 1-2 weeks for prototype + testing

---

## 🎯 **Figma File Structure**

### **File Organization**
```
LocalEx Prototype
├── 🎨 Design System
│   ├── Colors & Typography
│   ├── Components Library
│   └── Icon Library
├── 📱 Screens
│   ├── Onboarding Flow
│   ├── Main App Screens
│   └── Trade Flow Screens
├── 🔄 Prototypes
│   ├── User Journey 1: New User Onboarding
│   ├── User Journey 2: Item Listing Creation
│   ├── User Journey 3: Item Discovery & Search
│   ├── User Journey 4: Trade Negotiation
│   └── User Journey 5: Payment & Completion
└── 📋 Testing Materials
    ├── User Testing Scenarios
    ├── Feedback Forms
    └── Testing Scripts
```

---

## 🎨 **Design System Components**

### **Color Palette** (Based on Neighborhoods Foundation Logo)
```
Primary Colors (Logo-Inspired):
- Primary Brown: #5C3D2E (main brand color, buttons, links, active states)
- Success Green: #8BC34A (success messages, completed trades, positive actions)
- Accent Orange: #E88D2A (warnings, highlights, call-to-action elements)
- Error Red: #DC2626 (errors, failed transactions, critical alerts)

Neutral Colors:
- Background: #F9FAFB (main app background)
- Surface: #FFFFFF (cards, modals, inputs)
- Text Primary: #5C3D2E (headings, important text - matches logo brown)
- Text Secondary: #6B7280 (body text, descriptions)
- Text Muted: #9CA3AF (labels, placeholders)
- Border: #E5E7EB (dividers, input borders)
- Border Light: #F3F4F6 (subtle separators)

Gradient Colors (Logo-Inspired):
- Primary Gradient: Linear(135deg, #5C3D2E 0%, #3D281F 100%) (brown gradient)
- Success Gradient: Linear(135deg, #8BC34A 0%, #689F38 100%) (green gradient)
- Accent Gradient: Linear(135deg, #E88D2A 0%, #FF8F00 100%) (orange gradient)
```

### **Typography Scale** (Logo-Inspired)
```
Headings:
- H1: 32px, Bold, #5C3D2E (main titles - matches logo brown)
- H2: 24px, SemiBold, #5C3D2E (section titles)
- H3: 20px, SemiBold, #5C3D2E (card titles)
- H4: 18px, Medium, #5C3D2E (subsection titles)

Body Text:
- Large: 16px, Regular, #5C3D2E (primary content)
- Medium: 14px, Regular, #6B7280 (secondary content)
- Small: 12px, Regular, #6B7280 (labels, captions)

Special Text:
- Price: 20px, Bold, #8BC34A (item prices - matches logo green)
- Credit: 16px, Medium, #5C3D2E (credit amounts - matches logo brown)
- Status: 12px, Medium, varies by status (trade status)
- Highlight: 16px, Medium, #E88D2A (highlights - matches logo orange)
```

### **Component Library**

#### **Buttons** (Logo-Inspired)
```
Primary Button:
- Background: #5C3D2E (logo brown)
- Text: White, 16px Medium
- Padding: 12px 24px
- Border Radius: 8px
- Height: 48px

Secondary Button:
- Background: White
- Border: 1px solid #5C3D2E (logo brown)
- Text: #5C3D2E, 16px Medium
- Padding: 12px 24px
- Border Radius: 8px
- Height: 48px

Success Button:
- Background: #8BC34A (logo green)
- Text: White, 16px Medium
- Padding: 12px 24px
- Border Radius: 8px
- Height: 48px

Accent Button:
- Background: #E88D2A (logo orange)
- Text: White, 16px Medium
- Padding: 12px 24px
- Border Radius: 8px
- Height: 48px

Danger Button:
- Background: #DC2626
- Text: White, 16px Medium
- Padding: 12px 24px
- Border Radius: 8px
- Height: 48px

Small Button:
- Height: 36px
- Padding: 8px 16px
- Font Size: 14px
```

#### **Input Fields** (Logo-Inspired)
```
Text Input:
- Background: White
- Border: 1px solid #E5E7EB
- Border Radius: 8px
- Padding: 12px 16px
- Height: 48px
- Font: 16px Regular, #5C3D2E (logo brown)

Input Focus State:
- Border: 2px solid #5C3D2E (logo brown)
- Box Shadow: 0 0 0 3px rgba(92, 61, 46, 0.1)

Input Success State:
- Border: 2px solid #8BC34A (logo green)
- Box Shadow: 0 0 0 3px rgba(139, 195, 74, 0.1)

Input Error State:
- Border: 2px solid #DC2626
- Box Shadow: 0 0 0 3px rgba(220, 38, 38, 0.1)

Dropdown:
- Same as text input
- Right arrow icon: #6B7280
- Height: 48px

Text Area:
- Same styling as text input
- Height: 120px (minimum)
- Resize: Vertical only
```

#### **Cards**
```
Item Card:
- Background: White
- Border: 1px solid #E5E7EB
- Border Radius: 12px
- Padding: 16px
- Shadow: 0 1px 3px rgba(0, 0, 0, 0.1)

Trade Card:
- Background: White
- Border: 1px solid #E5E7EB
- Border Radius: 12px
- Padding: 20px
- Shadow: 0 2px 4px rgba(0, 0, 0, 0.1)

Profile Card:
- Background: White
- Border: 1px solid #E5E7EB
- Border Radius: 16px
- Padding: 24px
- Shadow: 0 4px 6px rgba(0, 0, 0, 0.1)
```

#### **Navigation**
```
Bottom Navigation:
- Background: White
- Border Top: 1px solid #E5E7EB
- Height: 80px
- Padding: 12px 0

Tab Item:
- Icon: 24px, #6B7280
- Label: 12px Medium, #6B7280
- Active Icon: #2563EB
- Active Label: #2563EB

Top Navigation:
- Background: White
- Border Bottom: 1px solid #E5E7EB
- Height: 64px
- Padding: 16px 20px
```

---

## 📱 **Screen Specifications**

### **Device Specifications**
```
Primary Device: iPhone 14 Pro
- Screen Size: 393 x 852px
- Safe Area: 44px top, 34px bottom
- Content Area: 393 x 774px

Secondary Device: iPhone SE
- Screen Size: 375 x 667px
- Safe Area: 20px top, 0px bottom
- Content Area: 375 x 647px

Desktop: Web App
- Screen Size: 1440 x 900px
- Content Area: 1200px max width, centered
```

### **Layout Grid**
```
Mobile:
- Columns: 4
- Gutter: 16px
- Margin: 20px
- Baseline: 8px

Desktop:
- Columns: 12
- Gutter: 24px
- Margin: 40px
- Baseline: 8px
```

---

## 🔄 **Prototype Interactions**

### **Interaction Types**
```
Tap Interactions:
- Button taps → Navigate to next screen
- Card taps → Open detail view
- Icon taps → Toggle state

Swipe Interactions:
- Item photos → Swipe between images
- Trade cards → Swipe to reveal actions

Scroll Interactions:
- List views → Vertical scroll
- Photo galleries → Horizontal scroll

Form Interactions:
- Input focus → Show keyboard
- Dropdown tap → Show options
- Checkbox tap → Toggle state
```

### **Animation Specifications**
```
Page Transitions:
- Duration: 300ms
- Easing: ease-in-out
- Type: Slide from right

Modal Animations:
- Duration: 250ms
- Easing: ease-out
- Type: Scale + fade

Button States:
- Duration: 150ms
- Easing: ease-in-out
- Type: Scale (0.95x)

Loading States:
- Duration: 1000ms
- Easing: linear
- Type: Spin or pulse
```

---

## 📋 **Content Guidelines**

### **Sample Content**
```
User Names:
- "Alex Chen", "Jordan Smith", "Casey Johnson", "Riley Brown"
- Display names: "Alex_C", "Jordan_S", "Casey_J", "Riley_B"

Item Categories:
- Electronics: "iPhone 13 Pro", "MacBook Air", "Sony Headphones"
- Furniture: "IKEA Desk", "Vintage Chair", "Coffee Table"
- Books: "Programming Guide", "Fiction Novel", "Textbook"
- Clothing: "Designer Jacket", "Running Shoes", "Dress Shirt"

Locations:
- "Downtown", "University District", "Suburbs", "Near Airport"
- Distances: "0.5 miles", "1.2 miles", "2.8 miles", "5.1 miles"

Prices:
- Electronics: $150 - $800
- Furniture: $50 - $300
- Books: $5 - $25
- Clothing: $20 - $150
```

### **Status Indicators** (Logo-Inspired)
```
Trade Status:
- "Pending Offer" - #E88D2A (logo orange)
- "Offer Sent" - #5C3D2E (logo brown)
- "Offer Accepted" - #8BC34A (logo green)
- "Payment Complete" - #8BC34A (logo green)
- "Trade Complete" - #8BC34A (logo green)
- "Cancelled" - #DC2626 (red)

User Status:
- "Online" - #8BC34A (logo green) dot
- "Recently Active" - #E88D2A (logo orange) dot
- "Offline" - Gray dot
- "Verified" - #8BC34A (logo green) checkmark
```

---

## 🧪 **Testing Scenarios Content**

### **Realistic Test Data**
```
Scenario 1: New User Registration
- Email: "test.user@example.com"
- Password: "SecurePass123!"
- Display Name: "TestUser_2025"
- Location: "Seattle, WA"

Scenario 2: Item Listing
- Title: "Vintage Leather Jacket"
- Category: "Clothing"
- Condition: "Good"
- Price: "$85"
- Description: "Genuine leather jacket, size M. Worn a few times, excellent condition. Perfect for fall weather."

Scenario 3: Item Search
- Search Term: "coffee table"
- Filters: Price $50-$200, Within 5 miles
- Results: 3 items found

Scenario 4: Trade Negotiation
- Initial Offer: "$75" (down from $85)
- Counter Offer: "$80"
- Final Agreement: "$80"

Scenario 5: Payment Process
- Item: "Vintage Leather Jacket"
- Price: "$80"
- Platform Fee: "$1.99"
- Total: "$81.99"
```

---

## 🎯 **Success Metrics**

### **Prototype Quality Checklist**
```
✅ Design System:
- [ ] All colors and typography defined
- [ ] Component library complete
- [ ] Consistent styling across screens
- [ ] Mobile-first responsive design

✅ User Flows:
- [ ] All 5 core user journeys complete
- [ ] Smooth transitions between screens
- [ ] Error states and edge cases covered
- [ ] Loading states implemented

✅ Content:
- [ ] Realistic sample data
- [ ] Appropriate placeholder text
- [ ] Proper image placeholders
- [ ] Consistent terminology

✅ Interactions:
- [ ] All buttons and links functional
- [ ] Form inputs working
- [ ] Navigation flows complete
- [ ] Modal and overlay interactions
```

### **Testing Readiness Checklist**
```
✅ Testing Materials:
- [ ] User testing scenarios written
- [ ] Feedback forms created
- [ ] Testing script prepared
- [ ] Participant recruitment plan

✅ Prototype Sharing:
- [ ] Figma file permissions set
- [ ] Sharing links generated
- [ ] Testing devices prepared
- [ ] Recording setup ready

✅ Data Collection:
- [ ] Metrics tracking plan
- [ ] Feedback collection method
- [ ] Analysis framework prepared
- [ ] Report template created
```

---

**🚀 This setup guide provides the foundation for creating a comprehensive Figma prototype that will enable rapid user validation before development begins!**
