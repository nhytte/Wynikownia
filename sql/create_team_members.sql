-- SQL to create table for team membership and join requests
CREATE TABLE IF NOT EXISTS TeamMembers (
  member_id SERIAL PRIMARY KEY,
  druzyna_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  role VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP,
  FOREIGN KEY (druzyna_id) REFERENCES Druzyny(druzyna_id),
  FOREIGN KEY (user_id) REFERENCES Uzytkownicy(user_id)
);

CREATE INDEX IF NOT EXISTS idx_teammembers_druzyna_id ON TeamMembers(druzyna_id);
CREATE INDEX IF NOT EXISTS idx_teammembers_user_id ON TeamMembers(user_id);
