SELECT p.uuid
FROM posts p
LEFT JOIN likes l ON l.post_id = p.id
LEFT JOIN users u ON u.id = l.user_id
WHERE u.uuid = '85b1ab98108a9669bfbba01782caf09c';
