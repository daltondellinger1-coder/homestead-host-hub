export type TutorialIconName =
  | 'mountain'
  | 'layout-grid'
  | 'more-horizontal'
  | 'plus'
  | 'bed-double'
  | 'search'
  | 'inbox'
  | 'calendar'
  | 'dollar'
  | 'target'
  | 'wrench'
  | 'filter'
  | 'alert'
  | 'camera'
  | 'check-circle'
  | 'lightbulb';

export interface TutorialStepContent {
  icon: TutorialIconName;
  title: string;
  description: string;
}

export const propertyManagerTutorialSteps: TutorialStepContent[] = [
  {
    icon: 'mountain',
    title: 'Welcome to Homestead Hill',
    description:
      'This is your home base for managing everything — units, guests, payments, and money. Let\'s walk through it real quick.',
  },
  {
    icon: 'layout-grid',
    title: 'Unit Cards',
    description:
      'Each card shows you who\'s in the unit, what they pay, and when the next payment is due. Tap "More details" to see check-in/out dates, deposit info, and future bookings. You can drag cards around to put them in whatever order you want.',
  },
  {
    icon: 'more-horizontal',
    title: 'Quick Actions',
    description:
      'Tap the three dots (⋯) on any unit card to do stuff like edit the unit, check lease history, add or change a guest, record a payment, or end a lease.',
  },
  {
    icon: 'plus',
    title: 'Adding Units & Guests',
    description:
      'Hit the gold "+" button at the top to add a new unit or book a future guest. Pick whether it\'s a 1BR, 2BR, or Cottage. If a unit is empty, you\'ll see a big "Add Guest" button right on the card.',
  },
  {
    icon: 'bed-double',
    title: 'Next Available Units',
    description:
      'At the top of the dashboard you\'ll see three cards showing the next open unit for each type — 1 Bedroom, 2 Bedroom, and Cottage. Tap one to jump straight to the calendar for that type.',
  },
  {
    icon: 'search',
    title: 'Find Open Units',
    description:
      'Got a booking request? Tap "Find Available Units by Date," plug in the dates, and you\'ll see every open unit right away. It shows you how many nights, the estimated cost, and who\'s booked before and after. You can book the unit right from there or jump to the calendar.',
  },
  {
    icon: 'inbox',
    title: 'Booking Requests Inbox',
    description:
      'Guests can request a stay through homestead-hill.com and those requests land in the Requests tab. You\'ll see a banner on the dashboard when new ones come in. Tap "Approve & Book" and the unit dropdown will only show units that are actually free for those exact dates — no double-booking. Tap "Decline" if it doesn\'t work out.',
  },
  {
    icon: 'calendar',
    title: 'Calendar View',
    description:
      'Tap Calendar at the bottom to see all your bookings laid out on a timeline. Use the arrows to flip between months and hit "Today" to snap back to the current date. Pull down to refresh.',
  },
  {
    icon: 'dollar',
    title: 'Finances',
    description:
      'See how much money has come in vs what\'s expected. You can filter by month, year, or a custom date range, and it\'ll show you how things compare to the last period.',
  },
  {
    icon: 'target',
    title: 'Management & Weekly Reports',
    description:
      'The Management tab shows how each unit is doing against its revenue target, occupancy, and Hannah\'s management fee. The Weekly tab gives you a Friday summary — what came in this week, what\'s booked for the next 30–60 days, and any gaps that need filling.',
  },
];

export const maintenanceTutorialSteps: TutorialStepContent[] = [
  {
    icon: 'wrench',
    title: 'Maintenance Portal Basics',
    description:
      'This portal is only for work orders. You can see what tenants reported, open the request, update the status, add notes, and mark the job done when it is handled.',
  },
  {
    icon: 'alert',
    title: 'Start with New Requests',
    description:
      'New requests are the first ones to check. Urgent requests show first, so handle gas leaks, water leaks, lockouts, no heat/AC, or electrical issues before routine repairs.',
  },
  {
    icon: 'filter',
    title: 'Filter by Unit',
    description:
      'Use the unit dropdown at the top when you are at a specific building or want to see everything for one unit. Switch back to All units before you leave so you do not miss another request.',
  },
  {
    icon: 'inbox',
    title: 'Open the Work Order',
    description:
      'Tap a request card to see the full description, tenant photos, who reported it, and the reported time. Look at photos before driving over so you know what tools or parts to bring.',
  },
  {
    icon: 'check-circle',
    title: 'Keep Status Updated',
    description:
      'Move a request to In Progress when you start or schedule the work. Mark it Done only after the issue is fixed, the area is safe/clean, and any follow-up parts or vendor work are noted.',
  },
  {
    icon: 'camera',
    title: 'Notes, Photos & Proof',
    description:
      'Use Notes for what you found, what you fixed, parts used, and anything still needed. If photos are available, compare before/after and mention the result clearly so the office knows what happened.',
  },
  {
    icon: 'lightbulb',
    title: 'Tips & Tricks',
    description:
      'Refresh the page if a request you expect is missing. Check Done before starting duplicate work. Do not delete or archive real requests unless Dalton/admin tells you to. When in doubt, leave a note instead of guessing.',
  },
];

export const adminTutorialSteps: TutorialStepContent[] = [
  ...propertyManagerTutorialSteps,
  ...maintenanceTutorialSteps,
  {
    icon: 'mountain',
    title: 'You\'re Good to Go!',
    description:
      'That\'s everything! Tap the three dots (⋮) in the top-right corner anytime to see this walkthrough again.',
  },
];
