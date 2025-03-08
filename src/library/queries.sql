SELECT
  (SELECT uuid FROM posts WHERE user_id = (SELECT id FROM users WHERE uuid = '85b1ab98108a9669bfbba01782caf09c')) AS post_count,
  (SELECT post_id OR comment_id FROM likes WHERE user_id = (SELECT id FROM users WHERE uuid = '85b1ab98108a9669bfbba01782caf09c')) AS like_count,
  (SELECT friend_id FROM friends WHERE user_id = (SELECT id FROM users WHERE uuid = '85b1ab98108a9669bfbba01782caf09c') OR 
    friend_id = (SELECT id FROM users WHERE uuid = '85b1ab98108a9669bfbba01782caf09c')) AS friend_count ;
--FROM users
--WHERE uuid = '85b1ab98108a9669bfbba01782caf09c';

