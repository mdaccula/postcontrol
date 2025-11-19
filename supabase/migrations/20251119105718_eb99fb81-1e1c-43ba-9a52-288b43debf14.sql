-- Limpar todas as subscrições antigas de push notifications
-- Isso força todos os usuários a fazer re-subscribe com a nova chave VAPID
DELETE FROM push_subscriptions;

-- Limpar tentativas pendentes de notificações
DELETE FROM push_notification_retries 
WHERE status IN ('pending', 'retrying');