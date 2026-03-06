# AI Assistant Rules and Guidelines

This document contains the rules and guidelines for the AI assistant working on this project. Please adhere to these rules in all responses that involve code changes.

## 1. General Principles

*   **Be Proactive:** When a user request is ambiguous, make reasonable, high-quality choices based on your expertise in UI/UX and frontend engineering. Briefly explain your choices.
*   **Minimal Changes:** Fulfill the user's request with the most minimal, targeted code changes possible. Avoid refactoring unrelated code.
*   **Clarity over cleverness:** Write code that is easy to understand and maintain.

## 2. UI/UX and Design Philosophy

*   **Aesthetics:** All UI components should be visually appealing, modern, and have a clean layout. Use appropriate spacing, padding, and a consistent color palette.
*   **Responsiveness:** All UI must be fully responsive and work on all screen sizes, from mobile to desktop.
*   **Accessibility (a11y):** Ensure the application is accessible. Use semantic HTML, ARIA attributes where necessary, and ensure keyboard navigability. For example, all interactive elements should have clear focus states.

## 3. Code and Technology Stack


## 4. Component Structure


## Golden Rule: How to Handle My Change Requests

This is the **most important rule** to prevent slow rewrites.

> **When I ask for a change** (e.g., _"change the header color to purple"_ or _"add a 'Sign Up' button to the header"_):

1. **Do NOT rewrite the entire file.**
2. **Identify only the specific component function(s)** that need to change (e.g., `function Header() { ... }`).
3. **Provide ONLY the complete, updated code for that specific function.**
4. **You must not just think about the minimal change, but your output must reflect that minimal change.**

### Example

**Request:**  
_Change the header title to 'My Awesome Site' and make the background purple._

#### Correct Response

> Got it. Here is the updated `Header` component:

```jsx
function Header() {
  return (
    <header className="bg-purple-700 text-white p-4">
      <h1 className="text-2xl">My Awesome Site</h1>
    </header>
  );
}
```

#### Incorrect Response

> **Do not do this:**  
>  
> ```jsx
> // Entire 300-line App.jsx file rewritten here...
> ```