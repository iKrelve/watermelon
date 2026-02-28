use chrono::{NaiveDate, Datelike, Duration, Weekday};
use crate::models::RecurrenceRule;

/// Calculate the next occurrence date based on a recurrence rule and the current date.
pub fn get_next_occurrence(rule: &RecurrenceRule, current_date: NaiveDate) -> NaiveDate {
    match rule.rule_type.as_str() {
        "daily" => current_date + Duration::days(rule.interval),
        "weekly" => {
            if let Some(ref days) = rule.days_of_week {
                if !days.is_empty() {
                    return get_next_weekly_occurrence(current_date, rule.interval, days);
                }
            }
            current_date + Duration::weeks(rule.interval)
        }
        "monthly" => get_next_monthly_occurrence(current_date, rule.interval, rule.day_of_month),
        "custom" => current_date + Duration::days(rule.interval),
        _ => current_date + Duration::days(1),
    }
}

/// For weekly recurrence with specific days of week.
fn get_next_weekly_occurrence(current_date: NaiveDate, interval: i64, days_of_week: &[i64]) -> NaiveDate {
    let mut sorted = days_of_week.to_vec();
    sorted.sort();

    // chrono: Monday=1..Sunday=7, but our API uses 0=Sunday..6=Saturday
    let current_day = match current_date.weekday() {
        Weekday::Sun => 0,
        Weekday::Mon => 1,
        Weekday::Tue => 2,
        Weekday::Wed => 3,
        Weekday::Thu => 4,
        Weekday::Fri => 5,
        Weekday::Sat => 6,
    };

    // Try to find next day in current week that's after current day
    for &day in &sorted {
        if day > current_day {
            return current_date + Duration::days(day - current_day);
        }
    }

    // No more days this week cycle, go to first day in next cycle
    let first_day = sorted[0];
    let days_until_next_week = 7 * interval - (current_day - first_day);
    current_date + Duration::days(days_until_next_week)
}

/// For monthly recurrence with optional day of month clamping.
fn get_next_monthly_occurrence(current_date: NaiveDate, interval: i64, day_of_month: Option<i64>) -> NaiveDate {
    let next_month = add_months(current_date, interval as u32);

    if let Some(dom) = day_of_month {
        let max_day = days_in_month(next_month.year(), next_month.month());
        let clamped = (dom as u32).min(max_day);
        NaiveDate::from_ymd_opt(next_month.year(), next_month.month(), clamped)
            .unwrap_or(next_month)
    } else {
        next_month
    }
}

fn add_months(date: NaiveDate, months: u32) -> NaiveDate {
    let total_months = date.year() * 12 + date.month() as i32 - 1 + months as i32;
    let new_year = total_months / 12;
    let new_month = (total_months % 12 + 1) as u32;
    let max_day = days_in_month(new_year, new_month);
    let new_day = date.day().min(max_day);
    NaiveDate::from_ymd_opt(new_year, new_month, new_day).unwrap_or(date)
}

fn days_in_month(year: i32, month: u32) -> u32 {
    // The day before the 1st of next month
    let next = if month == 12 {
        NaiveDate::from_ymd_opt(year + 1, 1, 1)
    } else {
        NaiveDate::from_ymd_opt(year, month + 1, 1)
    };
    next.map(|d| d.pred_opt().map(|p| p.day()).unwrap_or(28))
        .unwrap_or(28)
}
