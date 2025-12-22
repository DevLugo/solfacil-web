'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-2 sm:p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-2',
        month: 'flex flex-col gap-2 sm:gap-4',
        month_caption: 'flex items-center justify-between gap-2 px-1 pb-2',
        caption_label: 'text-xs sm:text-sm font-medium flex-1 text-center',
        dropdowns: 'flex gap-2 justify-center',
        dropdown: 'text-xs sm:text-sm font-medium bg-background border border-input rounded-md px-1.5 sm:px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring',
        dropdown_root: 'relative inline-block',
        nav: 'contents',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 sm:h-8 sm:w-8 p-0 opacity-60 hover:opacity-100 order-first'
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 sm:h-8 sm:w-8 p-0 opacity-60 hover:opacity-100 order-last'
        ),
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: 'flex',
        weekday:
          'text-muted-foreground rounded-md w-7 sm:w-9 font-normal text-[0.7rem] sm:text-[0.8rem]',
        week: 'flex w-full mt-2',
        day: cn(
          'relative p-0 text-center text-xs sm:text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-primary/15 [&:has([aria-selected].day-outside)]:bg-muted [&:has([aria-selected].day-range-end)]:rounded-r-md',
          props.mode === 'range'
            ? '[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md'
            : '[&:has([aria-selected])]:rounded-md'
        ),
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-7 w-7 sm:h-9 sm:w-9 p-0 font-normal aria-selected:opacity-100'
        ),
        range_end: 'day-range-end',
        selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        today: 'bg-muted text-foreground font-semibold',
        outside:
          'day-outside text-muted-foreground aria-selected:bg-muted aria-selected:text-muted-foreground',
        disabled: 'text-muted-foreground opacity-50',
        range_middle:
          'aria-selected:bg-primary/10 aria-selected:text-foreground',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Icon = orientation === 'left' ? ChevronLeft : ChevronRight
          return <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
