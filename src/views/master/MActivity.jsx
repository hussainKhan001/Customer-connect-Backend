import { Card, Chip, Timeline } from '../../components/Ui.jsx';
import { fmtD } from '../../lib/core.js';
import { activityFor } from '../../lib/derived.js';

const tone = (w) =>
  w === 'System' ? 'k'
  : w === 'Service' || w === 'Legal' ? 'r'
  : w === 'Referral' || w === 'Event' || w === 'Statement' ? 'o'
  : 'm';

export default function MActivity({ c }) {
  return (
    <Card title="Activity log" hint="every touch, by name">
      <Timeline>
        {activityFor(c).map((a, i) => (
          <li key={i}>
            <span className="d num">{fmtD(a.d)}</span>
            <span className="t">
              <Chip cls={tone(a.w)}>{a.w}</Chip> {a.t}
              <div className="sub2">by {a.by}</div>
            </span>
          </li>
        ))}
      </Timeline>
      <div className="note" style={{ marginTop: 12 }}>
        This log is the only thing that will ever let you re-fit the four weights against real second
        purchases. Until you have two quarters of outcomes here, 40/25/20/15 is a written, testable guess
        and nothing more.
      </div>
    </Card>
  );
}
