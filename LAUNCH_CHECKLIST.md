# Emily Chat Platform - Launch Checklist

## Pre-Launch Checklist

### 1. Environment Setup ☐

**Local Development:**
- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env.local` created with all variables
- [ ] Environment variables tested

**Supabase:**
- [ ] Project created on Supabase
- [ ] Database migrations run (001_initial_schema.sql)
- [ ] RLS policies enabled (002_rls_policies.sql)
- [ ] Tables verified in Table Editor
- [ ] API keys copied to .env.local

**Qdrant:**
- [ ] Server accessible at http://172.232.46.233:6333
- [ ] Connection tested (`curl http://172.232.46.233:6333/collections`)
- [ ] URL added to .env.local

**OpenAI:**
- [ ] Account created
- [ ] API key generated
- [ ] Billing set up (add payment method)
- [ ] Key added to .env.local

**Stripe:**
- [ ] Account created
- [ ] Test mode enabled for development
- [ ] Products created (Pro plan)
- [ ] Price IDs copied
- [ ] Test API keys added to .env.local
- [ ] Stripe Tax enabled

### 2. Local Testing ☐

**Basic Functionality:**
- [ ] App starts with `npm run dev`
- [ ] Home page loads at http://localhost:3000
- [ ] Login page accessible
- [ ] Signup page accessible

**User Flow:**
- [ ] Can create account
- [ ] User appears in Supabase `users` table
- [ ] Organization created in `organizations` table
- [ ] Membership created in `memberships` table
- [ ] Redirected to dashboard after signup

**Website Management:**
- [ ] Can create website
- [ ] Website appears on dashboard
- [ ] Website limit enforced (1 for free)
- [ ] Website detail page loads

**Training System:**
- [ ] Can add training item (text)
- [ ] Can record voice (microphone permission)
- [ ] Voice transcribes correctly
- [ ] Training items appear in list
- [ ] Can delete training items
- [ ] Training button works
- [ ] Training creates Qdrant collection
- [ ] Collection visible: `curl http://172.232.46.233:6333/collections`
- [ ] Training status updates correctly

**Chat System:**
- [ ] Can create conversation
- [ ] Can send message
- [ ] AI responds with relevant content
- [ ] Streaming works (text appears gradually)
- [ ] Messages saved to database
- [ ] Conversation history loads

**Widget:**
- [ ] Widget script accessible at `/widget/emily-chat.js`
- [ ] Test HTML page with widget works
- [ ] Widget bubble appears bottom-right
- [ ] Can open/close widget
- [ ] Can send messages from widget
- [ ] AI responds in widget
- [ ] Widget uses website's primary color

**Usage Limits:**
- [ ] Free user limited to 1 training run
- [ ] Free user limited to 50 messages
- [ ] Error message shown when limit reached
- [ ] Usage displayed on dashboard

### 3. Stripe Integration Testing ☐

**Test Mode (Development):**
- [ ] Checkout session creates successfully
- [ ] Test card works: `4242 4242 4242 4242`
- [ ] Subscription created in Stripe dashboard
- [ ] Webhook received and processed
- [ ] Organization upgraded to Pro
- [ ] Website limit increased to 5
- [ ] Training limit increased to 4/month
- [ ] Can access Stripe Customer Portal
- [ ] Can cancel subscription in portal
- [ ] Organization downgraded on cancellation

### 4. Deployment to Vercel ☐

**Git Setup:**
- [ ] Repository created on GitHub
- [ ] Code pushed to main branch
- [ ] .env.local NOT committed (check .gitignore)

**Vercel Setup:**
- [ ] Project imported to Vercel
- [ ] Framework preset: Next.js
- [ ] Environment variables added
- [ ] First deployment successful
- [ ] No build errors

**Production Configuration:**
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain
- [ ] Stripe live mode keys used (not test keys)
- [ ] Supabase production instance confirmed
- [ ] OpenAI production key confirmed
- [ ] Qdrant accessible from Vercel

**Stripe Production:**
- [ ] Live mode enabled
- [ ] Production products created
- [ ] Production webhook endpoint added
- [ ] Webhook secret updated in Vercel
- [ ] Webhook receives events successfully
- [ ] Test subscription in production

### 5. Production Testing ☐

**End-to-End Tests:**
- [ ] Create account on production
- [ ] Create website
- [ ] Add training content
- [ ] Train chatbot
- [ ] Verify Qdrant collection created
- [ ] Test owner conversation
- [ ] Embed widget on test site
- [ ] Test visitor conversation via widget
- [ ] Upgrade to Pro (use real payment method)
- [ ] Verify upgrade successful
- [ ] Test increased limits
- [ ] Purchase credits
- [ ] Verify credits added

**Performance:**
- [ ] Page load times < 2s
- [ ] Training completes in reasonable time
- [ ] Chat responses stream smoothly
- [ ] Widget loads quickly
- [ ] No console errors

**Security:**
- [ ] Protected routes require auth
- [ ] Can't access other orgs' data
- [ ] RLS policies working
- [ ] API keys not exposed in client
- [ ] CORS properly configured
- [ ] Stripe webhooks verify signatures

### 6. Monitoring & Analytics ☐

**Error Tracking:**
- [ ] Sentry or similar installed (optional)
- [ ] Error logging configured
- [ ] Test error reporting

**Analytics:**
- [ ] Analytics installed (optional)
- [ ] Key events tracked:
  - User signups
  - Website creations
  - Training runs
  - Conversations started
  - Subscriptions

**Logging:**
- [ ] Vercel function logs accessible
- [ ] Supabase logs checked
- [ ] Stripe dashboard monitored

### 7. Documentation ☐

**Internal Docs:**
- [ ] README.md reviewed
- [ ] SETUP.md complete
- [ ] PROJECT_SUMMARY.md accurate
- [ ] Environment variables documented

**User Documentation:**
- [ ] Help/FAQ page (optional)
- [ ] Embed code instructions clear
- [ ] Training guide available
- [ ] Support email set up

### 8. Backups & Disaster Recovery ☐

**Backups:**
- [ ] Supabase automatic backups enabled
- [ ] Qdrant backup strategy defined
- [ ] Environment variables backed up securely

**Recovery Plan:**
- [ ] Database restore procedure documented
- [ ] Qdrant restore procedure documented
- [ ] Rollback strategy defined

### 9. Final Checks ☐

**Legal/Compliance:**
- [ ] Privacy policy prepared (if needed)
- [ ] Terms of service prepared (if needed)
- [ ] GDPR compliance reviewed (if EU users)
- [ ] Payment processor compliance (Stripe)

**Performance:**
- [ ] Lighthouse score > 80
- [ ] Mobile responsive tested
- [ ] Different browsers tested (Chrome, Safari, Firefox)
- [ ] Different devices tested

**SEO (Optional):**
- [ ] Meta tags set
- [ ] Open Graph tags added
- [ ] Favicon added
- [ ] Sitemap generated

### 10. Launch! 🚀

**Go Live:**
- [ ] Final production test
- [ ] Monitor first few signups
- [ ] Check error logs
- [ ] Monitor Stripe dashboard
- [ ] Verify webhooks processing

**Post-Launch Monitoring:**
- [ ] Check daily for first week
- [ ] Monitor error rates
- [ ] Watch OpenAI usage/costs
- [ ] Track conversion rates
- [ ] Collect user feedback

## Emergency Contacts

**Services:**
- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support
- Stripe Support: https://support.stripe.com
- OpenAI Support: https://help.openai.com

**Critical Issues:**
1. **Database down:** Check Supabase status page
2. **Qdrant down:** Check server status, restart if needed
3. **Payments failing:** Check Stripe dashboard
4. **High costs:** Check OpenAI usage, implement rate limits

## Success Metrics

Track these metrics:
- [ ] User signups / day
- [ ] Websites created / day
- [ ] Training runs / day
- [ ] Conversations / day
- [ ] Messages / day
- [ ] Pro upgrades / month
- [ ] Revenue / month
- [ ] Churn rate
- [ ] Support tickets

## Cost Monitoring

Monitor monthly costs:
- [ ] OpenAI API usage
- [ ] Supabase usage (database size)
- [ ] Qdrant server costs
- [ ] Vercel hosting
- [ ] Stripe fees
- [ ] Total monthly burn

---

## Notes

Use this checklist for each deployment:
- Development → Staging → Production
- Check all items before promoting to next environment
- Document any issues encountered
- Update checklist based on learnings

**Good luck! 🎉**
