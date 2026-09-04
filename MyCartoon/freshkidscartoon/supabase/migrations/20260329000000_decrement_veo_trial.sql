create or replace function decrement_veo_trial(p_user_id text)
returns integer as $$
declare
  current_trials integer;
begin
  select veo_trials into current_trials 
  from profiles where user_id = p_user_id;
  
  if current_trials <= 0 then
    raise exception 'No trials remaining';
  end if;
  
  update profiles 
  set veo_trials = veo_trials - 1 
  where user_id = p_user_id
  returning veo_trials into current_trials;
  
  return current_trials;
end;
$$ language plpgsql security definer;
