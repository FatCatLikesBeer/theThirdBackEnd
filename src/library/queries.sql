SELECT u.uuid AS user_uuid, u.avatar, u.display_name, u.handle,
  p.uuid AS post_uuid, p.content, p.created_at,
  COUNT(c.post_id) AS comment_count, COUNT(l.post_id) AS like_count,
  COALESCE(
    json_group_array(
    json_object(
      'comment_uuid', c.uuid,
      'content', c.content,
      'created_at', c.created_at,
      'user_uuid', u2.uuid,
      'handle', u2.handle,
      'avatar', u2.avatar,
      'likes', l2.like_count
    )
  ), '[]') AS comments
  FROM posts p
  LEFT JOIN users u ON u.id = p.user_id
  LEFT JOIN comments c ON c.post_id = p.id
  LEFT JOIN likes l ON l.post_id = p.id
  LEFT JOIN users u2 ON c.user_id = u2.id
  LEFT JOIN (
    SELECT id, COUNT(*) AS like_count, comment_id
    FROM likes
    GROUP BY id
  ) l2 ON l2.comment_id = c.id
  WHERE p.uuid = '72501cea9c9c94ed07be61adeaead93a'
  GROUP BY p.id;
