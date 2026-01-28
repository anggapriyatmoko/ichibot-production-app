# STANDARD FOR REALTIME NOTIFICATIONS & UI UPDATES

To ensure a responsive and "Realtime" feel across the application, all notification-related actions must adhere to the following standard.

## 1. Notification Badge (`notification-badge.tsx`)

The notification badge is the central hub for user alerts. It must:

*   **Poll Frequently**: Use a short interval (e.g., **5 seconds**) to fetch the latest counts from the server. This ensures that actions from *other* users (e.g., Admin creating an order) are seen relatively quickly without manual refresh.
*   **Listen for Event**: It must listen for the custom window event `refresh-notifications`.
    ```typescript
    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 5000) // Standard 5s polling

        const handleRefresh = () => fetchData()
        window.addEventListener('refresh-notifications', handleRefresh)

        return () => {
            clearInterval(interval)
            window.removeEventListener('refresh-notifications', handleRefresh)
        }
    }, [])
    ```

## 2. Action Components (Modals, Forms, Lists)

Any component that performs an action that should update notifications (e.g., Creating an Order, Approving a Request, Reporting an Issue, Resolving an Issue) **MUST** dispatch the `refresh-notifications` event immediately after a successful server action.

### Pattern:
```typescript
const handleAction = async () => {
    const res = await serverAction(data)
    if (res.success) {
        showAlert('Success', 'Action completed')
        
        // 1. Refresh local data/table
        fetchLocalData() 
        
        // 2. Trigger Global Notification Refresh
        window.dispatchEvent(new Event('refresh-notifications')) 
    }
}
```

### Checklist for New Features:
- [ ] Does this action create/update/delete something that generates a notification?
- [ ] If YES, did you add `window.dispatchEvent(new Event('refresh-notifications'))` in the success block?
- [ ] Did you verify that the Notification Badge count updates immediately without a page reload?

## 3. Neural Detection & Production Issues

For "Neural Detection" (Production Issues), the same standard applies:
*   **Reporting an Issue**: Dispatch event on success.
*   **Resolving an Issue**: Dispatch event on success.
*   **Editing an Issue**: Dispatch event on success (if it might change status).

By following this standard, we ensure that the specific user taking the action sees immediate feedback in their top bar, while the polling mechanism covers updates from other users.
