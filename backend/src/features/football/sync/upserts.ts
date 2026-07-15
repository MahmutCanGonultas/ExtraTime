import type { PoolClient } from 'pg'
import type { RawFixture, RawStandingRow, RawTopScorer } from '../types'

// All writes go through a PoolClient so a sync can wrap a whole league in one
// transaction. Every statement is parameterized — never string-concatenated.

export async function upsertTeam(
  db: PoolClient,
  apiId: number,
  name: string,
  extra: { stadium?: string | null; city?: string | null } = {},
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO teams (api_football_id, name, stadium_name, city)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (api_football_id) DO UPDATE
       SET name = EXCLUDED.name,
           stadium_name = COALESCE(EXCLUDED.stadium_name, teams.stadium_name),
           city = COALESCE(EXCLUDED.city, teams.city),
           updated_at = now()
     RETURNING id`,
    [apiId, name, extra.stadium ?? null, extra.city ?? null],
  )
  return rows[0].id
}

export async function upsertFixture(
  db: PoolClient,
  leagueId: number,
  raw: RawFixture,
): Promise<void> {
  const homeId = await upsertTeam(db, raw.teams.home.id, raw.teams.home.name, {
    stadium: raw.fixture.venue.name,
    city: raw.fixture.venue.city,
  })
  const awayId = await upsertTeam(db, raw.teams.away.id, raw.teams.away.name)

  await db.query(
    `INSERT INTO fixtures (
       api_football_id, league_id, home_team_id, away_team_id, kickoff_at, status,
       home_score, away_score, halftime_home, halftime_away, round
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (api_football_id) DO UPDATE SET
       kickoff_at = EXCLUDED.kickoff_at,
       status = EXCLUDED.status,
       home_score = EXCLUDED.home_score,
       away_score = EXCLUDED.away_score,
       halftime_home = EXCLUDED.halftime_home,
       halftime_away = EXCLUDED.halftime_away,
       round = EXCLUDED.round,
       updated_at = now()`,
    [
      raw.fixture.id,
      leagueId,
      homeId,
      awayId,
      raw.fixture.date,
      raw.fixture.status.short,
      raw.goals.home,
      raw.goals.away,
      raw.score.halftime.home,
      raw.score.halftime.away,
      raw.league.round,
    ],
  )
}

export async function upsertStanding(
  db: PoolClient,
  leagueId: number,
  row: RawStandingRow,
): Promise<void> {
  const teamId = await upsertTeam(db, row.team.id, row.team.name)
  await db.query(
    `INSERT INTO standings (
       league_id, team_id, position, played, won, drawn, lost,
       goals_for, goals_against, points, form
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (league_id, team_id) DO UPDATE SET
       position = EXCLUDED.position,
       played = EXCLUDED.played,
       won = EXCLUDED.won,
       drawn = EXCLUDED.drawn,
       lost = EXCLUDED.lost,
       goals_for = EXCLUDED.goals_for,
       goals_against = EXCLUDED.goals_against,
       points = EXCLUDED.points,
       form = EXCLUDED.form,
       updated_at = now()`,
    [
      leagueId,
      teamId,
      row.rank,
      row.all.played,
      row.all.win,
      row.all.draw,
      row.all.lose,
      row.all.goals.for,
      row.all.goals.against,
      row.points,
      row.form,
    ],
  )
}

// Snapshot lists: replace the whole league list so players who dropped off the
// leaderboard disappear. We assign our own sequential rank to satisfy
// UNIQUE(league_id, rank) even when the API reports tied ranks.
export async function replaceTopScorers(
  db: PoolClient,
  leagueId: number,
  scorers: RawTopScorer[],
): Promise<number> {
  await db.query('DELETE FROM top_scorers WHERE league_id = $1', [leagueId])
  let rank = 0
  for (const s of scorers) {
    const stat = s.statistics[0]
    if (!stat) continue
    rank += 1
    const teamId = await upsertTeam(db, stat.team.id, stat.team.name)
    await db.query(
      `INSERT INTO top_scorers (league_id, player_name, team_id, goals, penalties, appearances, rank)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [leagueId, s.player.name, teamId, stat.goals.total ?? 0, stat.penalty.scored, stat.games.appearences, rank],
    )
  }
  return rank
}

export async function replaceTopAssists(
  db: PoolClient,
  leagueId: number,
  assisters: RawTopScorer[],
): Promise<number> {
  await db.query('DELETE FROM top_assists WHERE league_id = $1', [leagueId])
  let rank = 0
  for (const a of assisters) {
    const stat = a.statistics[0]
    if (!stat) continue
    rank += 1
    const teamId = await upsertTeam(db, stat.team.id, stat.team.name)
    await db.query(
      `INSERT INTO top_assists (league_id, player_name, team_id, assists, appearances, rank)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [leagueId, a.player.name, teamId, stat.goals.assists ?? 0, stat.games.appearences, rank],
    )
  }
  return rank
}
