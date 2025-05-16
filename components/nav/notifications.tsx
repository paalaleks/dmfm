import { Bell } from 'lucide-react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

// Removed local Notification interface, will use NotificationItemProps directly from context/item

export default function Notifications() {
  // const handleMarkAllAsRead = async () => { // Will be enabled later
  //   try {
  //     // await markAllNotificationsAsRead();
  //   } catch (err) {
  //     // Handle error appropriately, e.g., show a toast notification
  //     console.error("Failed to mark all notifications as read:", err);
  //   }
  // };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='ringAround'
          size='icon'
          aria-label='Open notifications'
          type='button'
          className='relative'
        >
          <Bell className='h-6 w-6 text-accent2 hover:text-accent2/90' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-80 md:w-96'
        align='end'
        forceMount
        sideOffset={8}
      ></PopoverContent>
    </Popover>
  );
}
