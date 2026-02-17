import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useStatsQuery, useDailyTrendQuery } from '@/hooks/useDataQueries'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CheckCircle2, ListTodo, TrendingUp, Target } from 'lucide-react'

type StatsPeriod = 'day' | 'week' | 'month'

const PERIOD_LABELS: Record<StatsPeriod, string> = {
  day: '今日',
  week: '本周',
  month: '本月',
}

/**
 * Statistics view - Shows task completion stats and trends.
 */
export function Statistics() {
  const [period, setPeriod] = useState<StatsPeriod>('week')
  const { data: stats, isLoading: statsLoading } = useStatsQuery(period)
  const { data: trend = [], isLoading: trendLoading } = useDailyTrendQuery(30)
  const loading = statsLoading || trendLoading

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-3 w-16" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12 mb-1" />
                <Skeleton className="h-3 w-10" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Chart skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const completionRate = stats ? Math.round(stats.completionRate * 100) : 0

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">统计</h1>
          <p className="text-sm text-muted-foreground mt-1">
            查看任务完成情况和趋势
          </p>
        </div>
        <Select
          value={period}
          onValueChange={(v) => setPeriod(v as StatsPeriod)}
        >
          <SelectTrigger className="w-28 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">今日</SelectItem>
            <SelectItem value="week">本周</SelectItem>
            <SelectItem value="month">本月</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              总任务数
            </CardTitle>
            <ListTodo className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.totalTasks ?? 0}</p>
            <p className="text-xs text-muted-foreground">{PERIOD_LABELS[period]}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              已完成
            </CardTitle>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.completedTasks ?? 0}</p>
            <p className="text-xs text-muted-foreground">{PERIOD_LABELS[period]}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              完成率
            </CardTitle>
            <Target className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{completionRate}%</p>
            <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              待完成
            </CardTitle>
            <TrendingUp className="size-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {(stats?.totalTasks ?? 0) - (stats?.completedTasks ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">剩余任务</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            过去 30 天趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
              暂无数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => {
                    const d = new Date(v)
                    return `${d.getMonth() + 1}/${d.getDate()}`
                  }}
                  className="text-xs"
                  tick={{ fill: 'var(--color-muted-foreground)' }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: 'var(--color-muted-foreground)' }}
                  allowDecimals={false}
                />
                <Tooltip
                  labelFormatter={(v: string) => {
                    const d = new Date(v)
                    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
                  }}
                  formatter={(value: number, name: string) => [
                    value,
                    name === 'completed' ? '完成' : '创建',
                  ]}
                  contentStyle={{
                    backgroundColor: 'var(--color-popover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#22c55e"
                  fillOpacity={1}
                  fill="url(#colorCompleted)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="created"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorCreated)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center justify-center gap-6 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2.5 rounded-full bg-emerald-500" />
              已完成
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2.5 rounded-full bg-blue-500" />
              已创建
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
