-- Public review reads are limited to approved entries. New customer submissions
-- are pending until an administrator approves them.
alter table public.reviews enable row level security;

grant select on public.reviews to anon, authenticated;
grant insert on public.reviews to anon, authenticated;
grant update, delete on public.reviews to authenticated;

drop policy if exists "Anyone can view approved reviews" on public.reviews;
create policy "Anyone can view approved reviews"
  on public.reviews for select to anon, authenticated
  using (status = 'approved');

drop policy if exists "Anyone can submit pending reviews" on public.reviews;
create policy "Anyone can submit pending reviews"
  on public.reviews for insert to anon, authenticated
  with check (
    status = 'pending'
    and coalesce(is_verified, false) = false
    and rating between 1 and 5
    and length(trim(author_name)) > 0
    and length(trim(body)) > 0
  );

drop policy if exists "Admins can manage reviews" on public.reviews;
create policy "Admins can manage reviews"
  on public.reviews for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

with imported_reviews (author_name, body) as (
  values
    ('Situma Wafula', 'Amazing & timely response to branding.'),
    ('Lynn Ngina', 'Really appreciated the work of the team at Protocol. They are very effective and reliable. They have a great selection of products and merchandise that are delivered with good customer service. Would definitely recommend them!'),
    ('Muthii The Voice', 'Very resourceful suppliers when it comes to promotional merchandise. Keep at it.'),
    ('Fedinard Kitheka', 'Unique products, good customer service and quality branding. My all-time first priority shop in merchandise and branding. Keep up the good work.'),
    ('Dane Waithaka', 'Protocol team is very efficient, consistent and observes time frames. They deliver products and branding. Customer care is good. I would recommend them any time of the season.'),
    ('Dynamic Vector', 'High quality products. Great customer service. Definitely a one-stop shop for all branding items.'),
    ('Racheal Njeri', 'Very professional team. If you ever need gift ideas, especially branded items, this is your go-to vendor. They always understand the assignment.'),
    ('martins', 'When consistency, hard work and discipline meet, great things happen. By great things I mean good quality branding and reliable customer service. Indeed, Protocol Promotions Limited is one of the best, if not the best, in town. I will recommend them any day.'),
    ('John Wakairi', 'Great stuff. Quality branding. Up-to-date technology in practice. Keep up the good work.'),
    ('Wan Maria', 'The service is excellent, the product quality is very good, the price is very affordable, and I will come here often in the future.'),
    ('Eric Gutu', 'Great customer care, unique products and quality branding. Team spirit all through.'),
    ('Annie. Maina', 'Good at delivering. Very punctual. Never let clients down. They do their best for client satisfaction.'),
    ('Francis C. Githutha', 'Great service and array of merchandise. The turnaround is amazing. Please visit them soonest.'),
    ('Kanyi Less', 'Good customer service, quality products and unique products. Good branding shop in town.'),
    ('Margaret Wanjiku', 'Quality unique products, great customer service and a one-stop shop for all your branding products.'),
    ('muchemi muthui', 'Lovely multi-colored gift items and professional printing at a wonderful wholesale price. Professional staff and in-time delivery. Thanks, Protocol.'),
    ('Francis Okola', 'Best suppliers of good quality silicone and event wristbands in Nairobi. Teamwork all through.'),
    ('sila muli', 'Thanks, Protocol, for being a reliable branding shop. Well done. I am a happy customer.'),
    ('Jack Mbugua', 'Wonderful work, super-finished products, well-balanced pricing.'),
    ('Mercy Nganga', 'The best branding shop in town with excellent customer service.'),
    ('Nellie Njogu', 'Quality products are here. We are happy for you. Happy client.'),
    ('Allen Kiiza', 'So far the best branding company in town. Very reliable.'),
    ('Robert Mulaa', 'Great teamwork. Best silicone wristbands in the branding industry.'),
    ('Peter Thiongo', 'Unique stuff. Served with a lot of enthusiasm. Wouldn''t mind recommending Protocol Promotions to other clients.'),
    ('Mortiz Computers', 'Good customer service, quality promotion and branding items.'),
    ('Tonnie Kageni', 'Timely, friendly and very affordable products. Highly recommended.'),
    ('Maina Joseph', 'Unique products and timely delivery. Would recommend them.'),
    ('Simon Thogo M', 'Protocol dealers are the best dealers one wouldn''t want to miss shopping with. They are the best.'),
    ('TIMOTHY JUMA', 'Good team service. Always ready to serve with a smile.'),
    ('victor achibo', 'I was well handled and my client was happy. Thank you, Protocol staff.'),
    ('GACUNGA PETER MAINA', 'Good service delivery. Keep building good brands.'),
    ('Adin Adi', 'Good service delivery. Keep up the good work.'),
    ('Titus Musembi', 'Brilliant work, hands-on. Lots of options to go with. Keep up.'),
    ('BlueLight Digital Arts', 'Very professional and time-conscious with their delivery of service. Kudos.'),
    ('Eunice Wambui', 'They have the best quality, and the branding is on another level.'),
    ('BENJAMIN MWAURA', 'Great teamwork and good reception.'),
    ('mungai thuo', 'Quality product. Delivery on time. Amazing team.'),
    ('Nathan Luginu', 'Great stuff. Brands that create opportunities!'),
    ('Teresiah Wanjiru', 'Best option to buy your gifts and promotional products.'),
    ('Geosons General Supplies', 'Well received, and the services are good.'),
    ('simon wambugu', 'Great works in the block. God bless you.'),
    ('jj mwania', 'Good work, a lot to choose from.'),
    ('Musa Wambui', 'Excellent work. Keep doing it.'),
    ('Chifú Kabaka', 'Very efficient, professional and creative.'),
    ('joseph wambui', 'Good customer service. 100% recommend.'),
    ('cliffwarui', 'Good work. Keep doing it.'),
    ('Hannah Chege', 'Thanks for your prompt response to my enquiries.'),
    ('Brian Terry', 'Great service in town.'),
    ('Marvin Nganga', 'The best there is and reliable.'),
    ('Emmanuel Bett', 'Great customer services.'),
    ('Jim Mwangi', 'One-stop shop for your printing.'),
    ('Inyange Fred', 'I love your work.'),
    ('Brand Zone', 'Good customer service.'),
    ('Ally Makala', 'Great reception and service.'),
    ('Maggie Maina', 'Good work.'),
    ('Patrick Mata', 'Professional and work ethics.'),
    ('collins omollo', 'Best ahead of the rest.'),
    ('Josphat Nganga', 'Great stuff.'),
    ('Martin Kamau', 'Z.'),
    ('target masters', 'Good works.')
)
insert into public.reviews (
  product_id,
  author_name,
  author_role,
  rating,
  body,
  status,
  is_verified,
  source,
  moderated_at
)
select
  null,
  imported.author_name,
  null,
  5,
  imported.body,
  'approved',
  false,
  'imported',
  now()
from imported_reviews as imported
where not exists (
  select 1
  from public.reviews as existing
  where lower(trim(existing.author_name)) = lower(trim(imported.author_name))
    and trim(existing.body) = trim(imported.body)
);

notify pgrst, 'reload schema';
